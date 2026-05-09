'use client';

interface ParagraphResult {
  index: number;
  preview: string;
  fullText: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high';
  issues: string[];
  wordCount: number;
}

interface ParagraphSelectorProps {
  paragraphs: ParagraphResult[];
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  maxSelect?: number;
}

export default function ParagraphSelector({
  paragraphs,
  selectedIndices,
  onSelectionChange,
  maxSelect = 10,
}: ParagraphSelectorProps) {
  const handleToggle = (index: number) => {
    if (selectedIndices.includes(index)) {
      onSelectionChange(selectedIndices.filter((i) => i !== index));
    } else {
      if (selectedIndices.length >= maxSelect) return;
      onSelectionChange([...selectedIndices, index]);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(paragraphs.map((p) => p.index).slice(0, maxSelect));
  };

  const handleSelectHighRisk = () => {
    const highRisk = paragraphs
      .filter((p) => p.riskLevel === 'high' || p.riskLevel === 'medium-high')
      .map((p) => p.index)
      .slice(0, maxSelect);
    onSelectionChange(highRisk);
  };

  const handleClearSelection = () => {
    onSelectionChange([]);
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'medium-high': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'medium-high': return '中高风险';
      case 'high': return '高风险';
      default: return '未知';
    }
  };

  const highRiskCount = paragraphs.filter(
    (p) => p.riskLevel === 'high' || p.riskLevel === 'medium-high'
  ).length;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            待处理段落
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            共 {paragraphs.length} 个段落，其中{' '}
            <span className="font-semibold text-red-600">{highRiskCount} 个高风险</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={selectedIndices.length === paragraphs.length || paragraphs.length > maxSelect}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="全选所有段落"
          >
            全选
          </button>
          <button
            onClick={handleSelectHighRisk}
            disabled={selectedIndices.length >= highRiskCount && highRiskCount <= maxSelect}
            className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="仅选择高风险段落"
          >
            仅选高危
          </button>
          <button
            onClick={handleClearSelection}
            disabled={selectedIndices.length === 0}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="清除所有选择"
          >
            清除
          </button>
        </div>
      </div>

      {selectedIndices.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            已选择 <strong>{selectedIndices.length}</strong> / {maxSelect} 个段落
            {selectedIndices.length >= maxSelect && (
              <span className="ml-2 text-orange-600">（已达上限）</span>
            )}
          </p>
        </div>
      )}

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {paragraphs.map((paragraph) => (
          <div
            key={paragraph.index}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              selectedIndices.includes(paragraph.index)
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
            onClick={() => handleToggle(paragraph.index)}
            role="checkbox"
            aria-checked={selectedIndices.includes(paragraph.index)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle(paragraph.index);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIndices.includes(paragraph.index)}
                onChange={() => handleToggle(paragraph.index)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                aria-label={`选择第${paragraph.index + 1}段`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-semibold text-gray-900">
                    P{paragraph.index + 1}
                  </span>
                  
                  <span
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${getRiskBadgeColor(
                      paragraph.riskLevel
                    )}`}
                  >
                    {getRiskLabel(paragraph.riskLevel)}
                  </span>

                  <span className={`text-lg font-bold ${
                    paragraph.score >= 60 ? 'text-red-600' :
                    paragraph.score >= 40 ? 'text-orange-600' :
                    paragraph.score >= 20 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    疑似度: {paragraph.score}%
                  </span>

                  <span className="text-xs text-gray-500 ml-auto">
                    {paragraph.wordCount} 字
                  </span>
                </div>

                <p className="text-sm text-gray-700 line-clamp-2 mb-2 leading-relaxed">
                  {paragraph.preview}
                </p>

                {paragraph.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {paragraph.issues.map((issue, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-200"
                      >
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
