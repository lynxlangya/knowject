const copyWithExecCommand = (value: string): void => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');

    if (!copied) {
      throw new Error('execCommand copy failed');
    }
  } finally {
    textarea.remove();
  }
};

export const copyProjectChatText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall through to the legacy copy path for environments with denied clipboard permission.
    }
  }

  copyWithExecCommand(value);
};
