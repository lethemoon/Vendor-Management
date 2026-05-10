'use client';

import { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';

export type ChartThemeMode = 'light' | 'dark' | 'colorblind';

export interface RiskColorMap {
  low: string;
  medium: string;
  mediumHigh: string;
  high: string;
}

export interface DocumentTypeColorMap {
  JOURNAL_ARTICLE: string;
  THESIS: string;
  BOOK: string;
  CONFERENCE_PAPER: string;
  WEBPAGE: string;
  PATENT: string;
}

export interface ChartColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  risk: RiskColorMap;
  documentType: DocumentTypeColorMap;
  background: string;
  surface: string;
  border: string;
  gridLine: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface ChartFontConfig {
  family: string;
  sizeAxis: number;
  sizeLabel: number;
  sizeTitle: number;
  sizeTooltip: number;
  sizeLegend: number;
  weightNormal: number;
  weightBold: number;
}

export interface ChartAnimationConfig {
  duration: number;
  easing: string;
  staggerDelay: number;
  isActive: boolean;
}

export interface ChartResponsiveConfig {
  breakpoints: { mobile: number; tablet: number; desktop: number };
  minChartWidth: number;
  minChartHeight: number;
}

export interface ExportConfig {
  dpi: number;
  format: 'png' | 'svg' | 'jpeg';
  quality: number;
  backgroundColor: string;
  includeWatermark: boolean;
  watermarkText?: string;
}

export interface ChartTheme {
  colors: ChartColors;
  font: ChartFontConfig;
  animation: ChartAnimationConfig;
  responsive: ChartResponsiveConfig;
  export: ExportConfig;
  borderRadius: number;
  spacing: number;
}

export interface ChartContextValue {
  theme: ChartTheme;
  mode: ChartThemeMode;
  exportConfig: ExportConfig;
  setMode: (mode: ChartThemeMode) => void;
  updateExportConfig: (config: Partial<ExportConfig>) => void;
}

const lightColors: ChartColors = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  risk: {
    low: '#22c55e',
    medium: '#eab308',
    mediumHigh: '#f97316',
    high: '#ef4444',
  },
  documentType: {
    JOURNAL_ARTICLE: '#3b82f6',
    THESIS: '#8b5cf6',
    BOOK: '#f59e0b',
    CONFERENCE_PAPER: '#10b981',
    WEBPAGE: '#6b7280',
    PATENT: '#ec4899',
  },
  background: '#ffffff',
  surface: '#f8fafc',
  border: '#e2e8f0',
  gridLine: '#e2e8f0',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
};

const darkColors: ChartColors = {
  ...lightColors,
  background: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  gridLine: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

const colorblindColors: ChartColors = {
  ...lightColors,
  risk: {
    low: '#0072b2',
    medium: '#e69f00',
    mediumHigh: '#cc79a7',
    high: '#d55e00',
  },
};

const colorMap: Record<ChartThemeMode, ChartColors> = {
  light: lightColors,
  dark: darkColors,
  colorblind: colorblindColors,
};

const defaultTheme: ChartTheme = {
  colors: lightColors,
  font: {
    family: '"Inter", system-ui, -apple-system, sans-serif',
    sizeAxis: 12,
    sizeLabel: 13,
    sizeTitle: 16,
    sizeTooltip: 12,
    sizeLegend: 12,
    weightNormal: 400,
    weightBold: 600,
  },
  animation: {
    duration: 600,
    easing: 'ease-out',
    staggerDelay: 150,
    isActive: true,
  },
  responsive: {
    breakpoints: { mobile: 768, tablet: 1024, desktop: 1280 },
    minChartWidth: 280,
    minChartHeight: 200,
  },
  export: {
    dpi: 2,
    format: 'png',
    quality: 0.95,
    backgroundColor: '#ffffff',
    includeWatermark: true,
    watermarkText: '智论AI - 数据来源',
  },
  borderRadius: 8,
  spacing: 16,
};

const ChartContext = createContext<ChartContextValue | null>(null);

export function ChartProvider({
  children,
  mode: initialMode = 'light',
}: {
  children: React.ReactNode;
  mode?: ChartThemeMode;
}) {
  const [mode, setMode] = useState<ChartThemeMode>(initialMode);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultTheme.export);

  const theme = useMemo<ChartTheme>(() => ({
    ...defaultTheme,
    colors: colorMap[mode],
  }), [mode]);

  const handleSetMode = useCallback((newMode: ChartThemeMode) => {
    setMode(newMode);
  }, []);

  const handleUpdateExportConfig = useCallback((config: Partial<ExportConfig>) => {
    setExportConfig((prev) => ({ ...prev, ...config }));
  }, []);

  const value = useMemo<ChartContextValue>(() => ({
    theme,
    mode,
    exportConfig,
    setMode: handleSetMode,
    updateExportConfig: handleUpdateExportConfig,
  }), [theme, mode, exportConfig, handleSetMode, handleUpdateExportConfig]);

  return (
    <ChartContext.Provider value={value}>
      <style>{generateCSSVariables(theme)}</style>
      {children}
    </ChartContext.Provider>
  );
}

export function useChartContext() {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error('useChartContext must be used within a ChartProvider');
  }
  return context;
}

function generateCSSVariables(theme: ChartTheme): string {
  const { colors, font } = theme;
  return `
    :root {
      --chart-primary: ${colors.primary};
      --chart-secondary: ${colors.secondary};
      --chart-success: ${colors.success};
      --chart-warning: ${colors.warning};
      --chart-danger: ${colors.danger};
      --chart-info: ${colors.info};
      --chart-risk-low: ${colors.risk.low};
      --chart-risk-medium: ${colors.risk.medium};
      --chart-risk-medium-high: ${colors.risk.mediumHigh};
      --chart-risk-high: ${colors.risk.high};
      --chart-bg: ${colors.background};
      --chart-surface: ${colors.surface};
      --chart-border: ${colors.border};
      --chart-grid-line: ${colors.gridLine};
      --chart-text-primary: ${colors.textPrimary};
      --chart-text-secondary: ${colors.textSecondary};
      --chart-text-muted: ${colors.textMuted};
      --chart-font-family: ${font.family};
      --chart-radius: ${theme.borderRadius}px;
      --chart-spacing: ${theme.spacing}px;
    }
  `;
}
