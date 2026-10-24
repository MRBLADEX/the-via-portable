type Translate = (key: string) => string;

export const translateDefinitionLabel = (
  label: string,
  translate: Translate,
  language: string,
) => {
  const parts = label.split(/\s+\/\s+/);
  if (parts.length === 2 && /[\u3400-\u9fff]/.test(parts[1])) {
    const [englishLabel, chineseLabel] = parts.map((part) => part.trim());
    return language.toLowerCase().startsWith('zh')
      ? chineseLabel
      : translate(englishLabel);
  }

  return translate(label);
};
