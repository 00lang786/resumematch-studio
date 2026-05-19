import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, FileDown, FileUp, GripVertical, Plus, Save, Trash2, Upload } from 'lucide-react';

type SectionKey = 'summary' | 'experience' | 'education' | 'skills';

interface SectionSetting {
  key: SectionKey;
  title: string;
  visible: boolean;
  accent: string;
  background: string;
}

const defaultSections: SectionSetting[] = [
  { key: 'summary', title: '个人总结', visible: true, accent: '#525252', background: '#f3f4f6' },
  { key: 'experience', title: '工作经历', visible: true, accent: '#525252', background: '#f3f4f6' },
  { key: 'education', title: '教育经历', visible: true, accent: '#525252', background: '#f3f4f6' },
  { key: 'skills', title: '专业技能', visible: true, accent: '#525252', background: '#f3f4f6' },
];

const draftStorageKey = 'resume-template-draft';

const defaultResumeData: ResumeData = {
  personalInfo: {
    name: '你的姓名',
    phone: '138****0000',
    email: 'you@example.com',
    yearsOfExperience: '3年工作经验',
    targetPosition: '目标岗位 / 岗位方向',
    photoUrl: ''
  },
  summary: '这里填写个人总结。建议用 2-4 句话说明你的核心经验、擅长方向和关键成果。可以选中文字后使用上方按钮添加 **加粗** 或 {blue:**重点强调**}。',
  experience: [
    {
      id: '1',
      company: '示例公司',
      position: '示例岗位',
      period: '2024.01 - 至今',
      tags: ['核心项目', '数据增长', '跨团队协作'],
      responsibilities: [
        '负责某核心模块从需求分析到上线迭代，协调设计、研发、运营完成交付。',
        '通过用户反馈和数据分析定位关键问题，推动方案优化，使核心指标提升 {blue:**20%**}。',
        '沉淀项目流程和复盘文档，提高团队后续协作效率。'
      ]
    }
  ],
  education: [
    {
      id: '1',
      school: '示例大学',
      major: '本科',
      degree: '示例专业',
      period: '2019.09 - 2023.06'
    }
  ],
  skills: ['用户研究', '数据分析', '项目管理', 'Figma', 'SQL']
};

interface ResumeDraftFile {
  version: 1;
  exportedAt: string;
  resumeData: ResumeData;
  sections: SectionSetting[];
}

const emphasisClassMap = {
  blue: 'font-medium text-[#1f5f99]',
  gray: 'text-neutral-500',
  red: 'font-medium text-[#b42318]',
} as const;

function renderFormattedText(text: string) {
  const pattern = /(\*\*([\s\S]+?)\*\*)|\{(blue|gray|red):([\s\S]+?)\}/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {renderFormattedText(match[2])}
        </strong>
      );
    } else if (match[3] && match[4]) {
      const color = match[3] as keyof typeof emphasisClassMap;
      parts.push(
        <span key={match.index} className={emphasisClassMap[color]}>
          {renderFormattedText(match[4])}
        </span>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface ResumeData {
  personalInfo: {
    name: string;
    phone: string;
    email: string;
    yearsOfExperience: string;
    targetPosition: string;
    photoUrl: string;
  };
  summary: string;
  experience: Array<{
    id: string;
    company: string;
    position: string;
    period: string;
    tags: string[];
    responsibilities: string[];
  }>;
  education: Array<{
    id: string;
    school: string;
    major: string;
    degree: string;
    period: string;
  }>;
  skills: string[];
}

export default function App() {
  const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData);

  const [isEditing, setIsEditing] = useState(false);
  const [sections, setSections] = useState<SectionSetting[]>(defaultSections);
  const [draftMessage, setDraftMessage] = useState('');
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const name = resumeData.personalInfo.name.trim() || '我的';
    document.title = `${name}-个人简历`;
  }, [resumeData.personalInfo.name]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftStorageKey);

    if (!savedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(savedDraft) as {
        resumeData?: ResumeData;
        sections?: SectionSetting[];
        savedAt?: string;
      };

      if (draft.resumeData) {
        setResumeData(draft.resumeData);
      }

      if (draft.sections) {
        setSections(draft.sections);
      }

      if (draft.savedAt) {
        setDraftMessage(`已加载暂存：${new Date(draft.savedAt).toLocaleString()}`);
      }
    } catch {
      setDraftMessage('暂存读取失败，请重新暂存');
    }
  }, []);

  const getSection = (key: SectionKey) => {
    return sections.find(section => section.key === key) ?? defaultSections.find(section => section.key === key)!;
  };

  const getSectionOrder = (key: SectionKey) => {
    const index = sections.findIndex(section => section.key === key);
    return index === -1 ? sections.length : index;
  };

  const updateSection = (key: SectionKey, updates: Partial<SectionSetting>) => {
    setSections(prev =>
      prev.map(section => (section.key === key ? { ...section, ...updates } : section))
    );
  };

  const moveSection = (key: SectionKey, direction: -1 | 1) => {
    setSections(prev => {
      const currentIndex = prev.findIndex(section => section.key === key);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }

      const next = [...prev];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  };

  const renderSectionHeader = (key: SectionKey, action?: ReactNode) => {
    const section = getSection(key);

    return (
      <div
        className="mb-3 flex items-center justify-between border-l-4 px-4 py-2.5"
        style={{ backgroundColor: section.background, borderLeftColor: section.accent }}
      >
        <h2 className="text-base font-extrabold tracking-normal text-black">
          {section.title}
        </h2>
        {action}
      </div>
    );
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResumeData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, photoUrl: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePersonalInfo = (field: keyof ResumeData['personalInfo'], value: string) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const updateSummary = (value: string) => {
    setResumeData(prev => ({ ...prev, summary: value }));
  };

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now().toString(),
        school: '学校名称',
        major: '本科',
        degree: '专业',
        period: '2019.09-2023.06'
      }]
    }));
  };

  const updateEducation = (id: string, field: keyof ResumeData['education'][0], value: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const deleteEducation = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: Date.now().toString(),
        company: '公司名称',
        position: '职位名称',
        period: '2024.01 - 至今',
        tags: ['标签1', '标签2'],
        responsibilities: ['工作内容描述']
      }]
    }));
  };

  const updateExperience = (id: string, field: string, value: any) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const deleteExperience = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const moveExperience = (id: string, direction: -1 | 1) => {
    setResumeData(prev => {
      const currentIndex = prev.experience.findIndex(exp => exp.id === id);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= prev.experience.length) {
        return prev;
      }

      const experience = [...prev.experience];
      [experience[currentIndex], experience[nextIndex]] = [experience[nextIndex], experience[currentIndex]];

      return { ...prev, experience };
    });
  };

  const addTag = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, tags: [...exp.tags, '新标签'] } : exp
      )
    }));
  };

  const updateTag = (id: string, tagIndex: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, tags: exp.tags.map((tag, i) => i === tagIndex ? value : tag) } : exp
      )
    }));
  };

  const deleteTag = (id: string, tagIndex: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, tags: exp.tags.filter((_, i) => i !== tagIndex) } : exp
      )
    }));
  };

  const addResponsibility = (id: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, responsibilities: [...exp.responsibilities, '新的工作内容'] } : exp
      )
    }));
  };

  const updateResponsibility = (id: string, respIndex: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, responsibilities: exp.responsibilities.map((resp, i) => i === respIndex ? value : resp) } : exp
      )
    }));
  };

  const deleteResponsibility = (id: string, respIndex: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, responsibilities: exp.responsibilities.filter((_, i) => i !== respIndex) } : exp
      )
    }));
  };

  const moveResponsibility = (id: string, respIndex: number, direction: -1 | 1) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => {
        if (exp.id !== id) {
          return exp;
        }

        const nextIndex = respIndex + direction;
        if (nextIndex < 0 || nextIndex >= exp.responsibilities.length) {
          return exp;
        }

        const responsibilities = [...exp.responsibilities];
        [responsibilities[respIndex], responsibilities[nextIndex]] = [
          responsibilities[nextIndex],
          responsibilities[respIndex],
        ];

        return { ...exp, responsibilities };
      })
    }));
  };

  const addSkill = () => {
    setResumeData(prev => ({
      ...prev,
      skills: [...prev.skills, '新技能']
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const deleteSkill = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const saveDraft = () => {
    const savedAt = new Date().toISOString();

    window.localStorage.setItem(
      draftStorageKey,
      JSON.stringify({
        resumeData,
        sections,
        savedAt,
      })
    );

    setDraftMessage(`已暂存：${new Date(savedAt).toLocaleString()}`);
  };

  const exportJson = () => {
    const exportedAt = new Date().toISOString();
    const draft: ResumeDraftFile = {
      version: 1,
      exportedAt,
      resumeData,
      sections,
    };
    const filenameName = resumeData.personalInfo.name.trim() || 'resume';
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${filenameName}-resume-draft.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setDraftMessage(`已导出 JSON：${new Date(exportedAt).toLocaleString()}`);
  };

  const importJson = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const draft = JSON.parse(String(reader.result)) as Partial<ResumeDraftFile>;

        if (!draft.resumeData || !draft.sections) {
          setDraftMessage('导入失败：JSON 文件格式不正确');
          return;
        }

        setResumeData(draft.resumeData);
        setSections(draft.sections);
        window.localStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            resumeData: draft.resumeData,
            sections: draft.sections,
            savedAt: new Date().toISOString(),
          })
        );
        setDraftMessage(`已导入 JSON：${file.name}`);
      } catch {
        setDraftMessage('导入失败：无法解析 JSON 文件');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const applyFormat = (
    textareaKey: string,
    value: string,
    updateValue: (nextValue: string) => void,
    before: string,
    after: string
  ) => {
    const textarea = textareaRefs.current[textareaKey];
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selectedText = value.slice(start, end) || '重点内容';
    const nextValue = `${value.slice(0, start)}${before}${selectedText}${after}${value.slice(end)}`;

    updateValue(nextValue);

    window.setTimeout(() => {
      const nextTextarea = textareaRefs.current[textareaKey];
      if (!nextTextarea) {
        return;
      }

      const selectionStart = start + before.length;
      const selectionEnd = selectionStart + selectedText.length;
      nextTextarea.focus();
      nextTextarea.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const renderFormatToolbar = (
    textareaKey: string,
    value: string,
    updateValue: (nextValue: string) => void
  ) => {
    const buttonClass = 'rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 hover:border-[#1f5f99] hover:text-[#1f5f99]';

    return (
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={buttonClass}
          onClick={() => applyFormat(textareaKey, value, updateValue, '**', '**')}
        >
          B
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => applyFormat(textareaKey, value, updateValue, '{blue:', '}')}
        >
          蓝色
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => applyFormat(textareaKey, value, updateValue, '{blue:**', '**}')}
        >
          蓝色+B
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => applyFormat(textareaKey, value, updateValue, '{gray:', '}')}
        >
          灰色
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => applyFormat(textareaKey, value, updateValue, '{red:', '}')}
        >
          红色
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-[21cm] mx-auto">
        {/* 工具栏 */}
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="rounded-md bg-[#1f5f99] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#184d7d]"
            >
              {isEditing ? '预览模式' : '编辑模式'}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              className="flex items-center gap-2 rounded-md bg-neutral-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-900"
            >
              <Save className="w-4 h-4" />
              暂存草稿
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-[#1f5f99] hover:text-[#1f5f99]"
            >
              <FileDown className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:border-[#1f5f99] hover:text-[#1f5f99]"
            >
              <FileUp className="w-4 h-4" />
              导入 JSON
            </button>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <Download className="w-4 h-4" />
              打印 / 导出 PDF
            </button>
          </div>
          {draftMessage && (
            <span className="text-xs text-neutral-500">{draftMessage}</span>
          )}
        </div>

        {isEditing && (
          <div className="mb-6 rounded-md border border-neutral-200 bg-white p-4 shadow-sm print:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">模块设置</h2>
                <p className="text-xs text-neutral-500">可调整模块名称、显示状态和排列顺序。</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sections.map((section, index) => (
                <div
                  key={section.key}
                  className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-400" />
                  <span
                    className="h-6 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: section.accent }}
                  />
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.key, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded border border-neutral-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#1f5f99]"
                    aria-label={`${section.title}模块名称`}
                  />
                  <button
                    type="button"
                    onClick={() => updateSection(section.key, { visible: !section.visible })}
                    className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 disabled:opacity-40"
                    aria-label={section.visible ? `隐藏${section.title}` : `显示${section.title}`}
                  >
                    {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.key, -1)}
                    disabled={index === 0}
                    className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`上移${section.title}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(section.key, 1)}
                    disabled={index === sections.length - 1}
                    className="rounded p-1.5 text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label={`下移${section.title}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 简历内容 */}
        <div className="resume-page min-h-[29.7cm] bg-white p-7 shadow-md print:min-h-0 print:shadow-none md:p-10">
          {/* 头部：个人信息 + 照片 */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-200">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={resumeData.personalInfo.name}
                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                    className="text-2xl font-bold p-1 border-b-2 border-neutral-300 focus:border-[#1f5f99] focus:outline-none w-48"
                  />
                  <div className="flex gap-4 text-sm">
                    <input
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                      className="p-1 border-b border-neutral-300 focus:border-[#1f5f99] focus:outline-none w-32"
                      placeholder="电话"
                    />
                    <input
                      type="email"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => updatePersonalInfo('email', e.target.value)}
                      className="p-1 border-b border-neutral-300 focus:border-[#1f5f99] focus:outline-none w-40"
                      placeholder="邮箱"
                    />
                    <input
                      type="text"
                      value={resumeData.personalInfo.yearsOfExperience}
                      onChange={(e) => updatePersonalInfo('yearsOfExperience', e.target.value)}
                      className="p-1 border-b border-neutral-300 focus:border-[#1f5f99] focus:outline-none w-32"
                      placeholder="工作年限"
                    />
                  </div>
                  <input
                    type="text"
                    value={resumeData.personalInfo.targetPosition}
                    onChange={(e) => updatePersonalInfo('targetPosition', e.target.value)}
                    className="text-sm p-1 border-b border-neutral-300 focus:border-[#1f5f99] focus:outline-none w-full"
                    placeholder="求职意向"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-neutral-900 mb-2">{resumeData.personalInfo.name}</h1>
                  <div className="flex gap-4 text-sm text-black mb-1">
                    <span>{resumeData.personalInfo.phone}</span>
                    <span>|</span>
                    <span>{resumeData.personalInfo.email}</span>
                    <span>|</span>
                    <span>{resumeData.personalInfo.yearsOfExperience}</span>
                  </div>
                  <div className="text-sm text-black">
                    <span className="font-medium">求职意向：</span>{resumeData.personalInfo.targetPosition}
                  </div>
                </>
              )}
            </div>

            {/* 照片区域 */}
            <div className="ml-6">
              {isEditing ? (
                <div className="relative">
                  <label className="cursor-pointer block">
                    <div className="w-24 h-32 border-2 border-dashed border-neutral-300 rounded flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 transition-colors">
                      {resumeData.personalInfo.photoUrl ? (
                        <img
                          src={resumeData.personalInfo.photoUrl}
                          alt="照片"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-1 text-neutral-400" />
                          <span className="text-xs text-neutral-500">上传照片</span>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                resumeData.personalInfo.photoUrl && (
                  <img
                    src={resumeData.personalInfo.photoUrl}
                    alt="照片"
                    className="w-24 h-32 object-cover rounded border border-neutral-200"
                  />
                )
              )}
            </div>
          </div>

          <div className="flex flex-col">
          {/* 个人总结 */}
          <div
            className="mb-6"
            style={{
              order: getSectionOrder('summary'),
              display: getSection('summary').visible ? undefined : 'none',
            }}
          >
            {renderSectionHeader('summary')}
            {isEditing ? (
              <div>
                <p className="mb-2 px-1 text-xs text-neutral-500">
                  选中文字后点按钮即可套用格式，也可手动输入：**加粗**、{'{blue:蓝色}'}、{'{blue:**蓝色加粗**}'}
                </p>
                <div className="mb-2 px-1">
                  {renderFormatToolbar('summary', resumeData.summary, updateSummary)}
                </div>
                <textarea
                  ref={(element) => {
                    textareaRefs.current.summary = element;
                  }}
                  value={resumeData.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  className="w-full p-3 border-2 border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none min-h-24 text-sm"
                  placeholder="请输入个人总结..."
                />
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words px-4 text-sm leading-relaxed text-black">
                {renderFormattedText(resumeData.summary)}
              </p>
            )}
          </div>

          {/* 工作经历 */}
          <div
            className="mb-6"
            style={{
              order: getSectionOrder('experience'),
              display: getSection('experience').visible ? undefined : 'none',
            }}
          >
            {renderSectionHeader(
              'experience',
              isEditing && (
                <button
                  type="button"
                  onClick={addExperience}
                  className="flex items-center gap-1 text-sm text-[#1f5f99] hover:text-[#184d7d]"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              )
            )}
            {resumeData.experience.map((exp, expIndex) => (
              <div key={exp.id} className="mb-5 px-4">
                {isEditing ? (
                  <div className="space-y-3 p-4 border border-neutral-200 rounded bg-neutral-50">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={exp.position}
                            onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                            className="flex-1 p-2 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none bg-white"
                            placeholder="职位"
                          />
                          <input
                            type="text"
                            value={exp.period}
                            onChange={(e) => updateExperience(exp.id, 'period', e.target.value)}
                            className="w-44 p-2 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none bg-white"
                            placeholder="时间"
                          />
                        </div>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          className="w-full p-2 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none bg-white"
                          placeholder="公司"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExperience(exp.id)}
                        className="text-red-600 hover:text-red-700 p-1 mt-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="mt-1 flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveExperience(exp.id, -1)}
                          disabled={expIndex === 0}
                          className="rounded p-1 text-neutral-500 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="上移公司经历"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExperience(exp.id, 1)}
                          disabled={expIndex === resumeData.experience.length - 1}
                          className="rounded p-1 text-neutral-500 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="下移公司经历"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 标签编辑 */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {exp.tags.map((tag, tagIndex) => (
                          <div key={tagIndex} className="flex items-center gap-1">
                            <input
                              type="text"
                              value={tag}
                              onChange={(e) => updateTag(exp.id, tagIndex, e.target.value)}
                              className="px-2 py-1 text-xs border border-[#b7d1ea] rounded bg-white focus:border-[#1f5f99] focus:outline-none w-20"
                            />
                            <button
                              type="button"
                              onClick={() => deleteTag(exp.id, tagIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addTag(exp.id)}
                          className="px-2 py-1 text-xs border border-dashed border-neutral-400 rounded hover:border-[#1f5f99] text-neutral-600 hover:text-[#1f5f99]"
                        >
                          + 标签
                        </button>
                      </div>
                    </div>

                    {/* 职责编辑 */}
                    <div className="space-y-2">
                      <p className="text-xs text-neutral-500">
                        选中文字后点按钮即可套用格式。
                      </p>
                      {exp.responsibilities.map((resp, respIndex) => (
                        <div key={respIndex} className="flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            {renderFormatToolbar(
                              `responsibility-${exp.id}-${respIndex}`,
                              resp,
                              (nextValue) => updateResponsibility(exp.id, respIndex, nextValue)
                            )}
                            <textarea
                              ref={(element) => {
                                textareaRefs.current[`responsibility-${exp.id}-${respIndex}`] = element;
                              }}
                              value={resp}
                              onChange={(e) => updateResponsibility(exp.id, respIndex, e.target.value)}
                              className="w-full resize-none rounded border border-neutral-300 bg-white p-2 text-sm focus:border-[#1f5f99] focus:outline-none"
                              rows={2}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteResponsibility(exp.id, respIndex)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => moveResponsibility(exp.id, respIndex, -1)}
                              disabled={respIndex === 0}
                              className="rounded p-1 text-neutral-500 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="上移职责"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveResponsibility(exp.id, respIndex, 1)}
                              disabled={respIndex === exp.responsibilities.length - 1}
                              className="rounded p-1 text-neutral-500 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="下移职责"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addResponsibility(exp.id)}
                        className="text-[#1f5f99] hover:text-[#184d7d] text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        添加职责
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-bold text-black">{exp.company}</span>
                          <span className="text-sm font-bold text-black">| {exp.position}</span>
                          {exp.tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="whitespace-nowrap rounded border border-[#b7d1ea] bg-[#e8f2fb] px-2 py-0.5 text-sm leading-5 text-[#1f5f99]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="ml-4 whitespace-nowrap text-sm font-bold text-black">{exp.period}</span>
                    </div>
                    <div className="text-sm text-black space-y-1 ml-2">
                      {exp.responsibilities.map((resp, respIndex) => (
                        <div key={respIndex} className="whitespace-pre-wrap break-words leading-relaxed">
                          {renderFormattedText(resp)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 教育经历 */}
          <div
            className="mb-6"
            style={{
              order: getSectionOrder('education'),
              display: getSection('education').visible ? undefined : 'none',
            }}
          >
            {renderSectionHeader(
              'education',
              isEditing && (
                <button
                  type="button"
                  onClick={addEducation}
                  className="flex items-center gap-1 text-sm text-[#1f5f99] hover:text-[#184d7d]"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              )
            )}
            {resumeData.education.map((edu) => (
              <div key={edu.id} className="mb-2 px-4">
                {isEditing ? (
                  <div className="space-y-2 p-3 border border-neutral-200 rounded">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                        className="flex-1 p-1.5 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none"
                        placeholder="学校"
                      />
                      <input
                        type="text"
                        value={edu.period}
                        onChange={(e) => updateEducation(edu.id, 'period', e.target.value)}
                        className="w-40 p-1.5 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none"
                        placeholder="时间"
                      />
                      <button
                        type="button"
                        onClick={() => deleteEducation(edu.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={edu.major}
                        onChange={(e) => updateEducation(edu.id, 'major', e.target.value)}
                        className="w-24 p-1.5 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none"
                        placeholder="学历"
                      />
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        className="flex-1 p-1.5 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none"
                        placeholder="专业"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start text-sm">
                    <div className="flex-1">
                      <span className="font-medium text-black">{edu.school}</span>
                      <span className="mx-2 text-neutral-400">（{edu.major}）</span>
                      <span className="text-black">{edu.degree}</span>
                    </div>
                    <span className="text-neutral-700 ml-4">{edu.period}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 专业技能 */}
          <div
            style={{
              order: getSectionOrder('skills'),
              display: getSection('skills').visible ? undefined : 'none',
            }}
          >
            {renderSectionHeader(
              'skills',
              isEditing && (
                <button
                  type="button"
                  onClick={addSkill}
                  className="flex items-center gap-1 text-sm text-[#1f5f99] hover:text-[#184d7d]"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              )
            )}
            <div className="flex flex-wrap gap-2 px-4">
              {resumeData.skills.map((skill, index) => (
                <div key={index}>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={skill}
                        onChange={(e) => updateSkill(index, e.target.value)}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded focus:border-[#1f5f99] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => deleteSkill(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 bg-neutral-100 text-black text-sm rounded border border-neutral-300 inline-block">
                      {skill}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html,
          body {
            background: #ffffff !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .resume-page {
            box-shadow: none !important;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}


