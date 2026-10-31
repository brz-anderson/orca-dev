const MARKDOWN_FENCE_LANGUAGES = new Set(['markdown', 'md'])

/** Fences the expanded view can preview; `mdx` stays raw because the parser does not read JSX. */
export function isBrzaMarkdownFence(language: string | null | undefined): boolean {
  return MARKDOWN_FENCE_LANGUAGES.has(language?.trim().toLowerCase() ?? '')
}

/** The fence language a chat code block shows in its header, if it has one. */
export function brzaCodeBlockLanguage(content: Element): string | null {
  return (
    content
      .closest('[data-native-chat-code-block]')
      ?.querySelector('[data-code-language]')
      ?.getAttribute('data-code-language') ?? null
  )
}
