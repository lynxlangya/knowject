import {
  XMarkdown,
  type ComponentProps as XMarkdownComponentProps,
} from '@ant-design/x-markdown';
import {
  cloneElement,
  isValidElement,
  type ReactNode,
} from 'react';
import { tp } from './project.i18n';
import {
  resolveDraftSourceTokens,
  type ProjectChatDraftSourceToken,
} from './projectChatSources';

const joinClassName = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

const PROJECT_CHAT_INLINE_SOURCE_TAG_PATTERN =
  /\[\[(?:source\d+|SOURCE_TAG:[\d,\s]+)\]\]/g;

const renderProjectChatMarkdownInlineSourceTags = (
  node: ReactNode,
  renderInlineSourceTag?: (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => ReactNode | null,
): ReactNode => {
  if (!renderInlineSourceTag) {
    return node;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node);
    if (!PROJECT_CHAT_INLINE_SOURCE_TAG_PATTERN.test(text)) {
      PROJECT_CHAT_INLINE_SOURCE_TAG_PATTERN.lastIndex = 0;
      return node;
    }

    PROJECT_CHAT_INLINE_SOURCE_TAG_PATTERN.lastIndex = 0;
    const tokens = resolveDraftSourceTokens(text);

    if (tokens.length === 0) {
      return node;
    }

    const fragments: ReactNode[] = [];
    let lastIndex = 0;

    tokens.forEach((token) => {
      if (token.start > lastIndex) {
        fragments.push(text.slice(lastIndex, token.start));
      }

      const renderedTag = renderInlineSourceTag(token.sourceKeys, token);
      fragments.push(renderedTag ?? token.rawText);
      lastIndex = token.end;
    });

    if (lastIndex < text.length) {
      fragments.push(text.slice(lastIndex));
    }

    return fragments;
  }

  if (Array.isArray(node)) {
    return node.map((child) =>
      renderProjectChatMarkdownInlineSourceTags(child, renderInlineSourceTag),
    );
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return cloneElement(node, {
      children: renderProjectChatMarkdownInlineSourceTags(
        node.props.children,
        renderInlineSourceTag,
      ),
    });
  }

  return node;
};

const splitMarkdownDomProps = <TRest extends Record<string, unknown>>(
  props: TRest,
) => {
  const {
    class: legacyClassName,
    ...restProps
  } = props as TRest & {
    class?: unknown;
  };

  return {
    legacyClassName:
      typeof legacyClassName === 'string' ? legacyClassName : undefined,
    restProps,
  };
};

const renderMarkdownParagraph = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps & {
  renderInlineSourceTag?: (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => ReactNode | null;
}) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);
  const renderedChildren = renderProjectChatMarkdownInlineSourceTags(
    children,
    rest.renderInlineSourceTag,
  );

  return (
    <p
      {...restProps}
      className={joinClassName(
        'mb-3 text-sm leading-7 text-slate-700 last:mb-0',
        legacyClassName,
        className,
      )}
    >
      {renderedChildren}
    </p>
  );
};

const renderMarkdownHeading1 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <h1
      {...restProps}
      className={joinClassName(
        'mb-3 text-xl font-semibold text-slate-900',
        legacyClassName,
        className,
      )}
    >
      {children}
    </h1>
  );
};

const renderMarkdownHeading2 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <h2
      {...restProps}
      className={joinClassName(
        'mb-3 text-lg font-semibold text-slate-900',
        legacyClassName,
        className,
      )}
    >
      {children}
    </h2>
  );
};

const renderMarkdownHeading3 = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <h3
      {...restProps}
      className={joinClassName(
        'mb-3 text-base font-semibold text-slate-900',
        legacyClassName,
        className,
      )}
    >
      {children}
    </h3>
  );
};

const renderMarkdownList = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <ul
      {...restProps}
      className={joinClassName(
        'mb-3 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700 last:mb-0',
        legacyClassName,
        className,
      )}
    >
      {children}
    </ul>
  );
};

const renderMarkdownOrderedList = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <ol
      {...restProps}
      className={joinClassName(
        'mb-3 list-decimal space-y-1 pl-5 text-sm leading-7 text-slate-700 last:mb-0',
        legacyClassName,
        className,
      )}
    >
      {children}
    </ol>
  );
};

const renderMarkdownListItem = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps & {
  renderInlineSourceTag?: (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => ReactNode | null;
}) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);
  const renderedChildren = renderProjectChatMarkdownInlineSourceTags(
    children,
    rest.renderInlineSourceTag,
  );

  return (
    <li
      {...restProps}
      className={joinClassName(
        'text-sm leading-7 text-slate-700',
        legacyClassName,
        className,
      )}
    >
      {renderedChildren}
    </li>
  );
};

const renderMarkdownPre = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <pre
      {...restProps}
      className={joinClassName(
        'mb-3 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100 last:mb-0',
        legacyClassName,
        className,
      )}
    >
      {children}
    </pre>
  );
};

const renderMarkdownCode = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  block,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  if (block) {
    return (
      <code
        {...restProps}
        className={joinClassName(
          'font-mono text-xs leading-6 text-slate-100',
          legacyClassName,
          className,
        )}
      >
        {children}
      </code>
    );
  }

  return (
    <code
      {...restProps}
      className={joinClassName(
        'rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700',
        legacyClassName,
        className,
      )}
    >
      {children}
    </code>
  );
};

const renderMarkdownLink = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <a
      {...restProps}
      className={joinClassName(
        'font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-3 hover:text-emerald-800',
        legacyClassName,
        className,
      )}
    >
      {children}
    </a>
  );
};

const renderMarkdownBlockquote = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  children,
  className,
  ...rest
}: XMarkdownComponentProps) => {
  const { legacyClassName, restProps } = splitMarkdownDomProps(rest);

  return (
    <blockquote
      {...restProps}
      className={joinClassName(
        'mb-3 border-l-3 border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm leading-7 text-slate-700 last:mb-0',
        legacyClassName,
        className,
      )}
    >
      {children}
    </blockquote>
  );
};

const renderMarkdownImage = ({
  domNode: _domNode,
  streamStatus: _streamStatus,
  src,
  alt,
  title,
  className,
}: XMarkdownComponentProps<{
  alt?: string;
  src?: string;
  title?: string;
}>) => {
  const fallbackLabel =
    alt?.trim() || title?.trim() || tp('conversation.externalImageLabel');

  return (
    <span
      className={joinClassName(
        'mb-3 inline-flex max-w-full flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900 last:mb-0',
        className,
      )}
    >
      <span className="font-semibold">{tp('conversation.externalImageBlocked')}</span>
      <span>{fallbackLabel}</span>
      {src ? (
        <span className="break-all text-caption leading-5 text-amber-700">
          {src}
        </span>
      ) : null}
    </span>
  );
};

export const ProjectChatMarkdown = ({
  content,
  renderInlineSourceTag,
}: {
  content: string;
  renderInlineSourceTag?: (
    sourceKeys: string[],
    token: ProjectChatDraftSourceToken,
  ) => ReactNode | null;
}) => {
  return (
    <XMarkdown
      content={content}
      openLinksInNewTab
      escapeRawHtml
      components={{
        p: (props) =>
          renderMarkdownParagraph({
            ...props,
            renderInlineSourceTag,
          } as typeof props & {
            renderInlineSourceTag?: (
              sourceKeys: string[],
              token: ProjectChatDraftSourceToken,
            ) => ReactNode | null;
          }),
        h1: renderMarkdownHeading1,
        h2: renderMarkdownHeading2,
        h3: renderMarkdownHeading3,
        ul: renderMarkdownList,
        ol: renderMarkdownOrderedList,
        li: (props) =>
          renderMarkdownListItem({
            ...props,
            renderInlineSourceTag,
          } as typeof props & {
            renderInlineSourceTag?: (
              sourceKeys: string[],
              token: ProjectChatDraftSourceToken,
            ) => ReactNode | null;
          }),
        pre: renderMarkdownPre,
        code: renderMarkdownCode,
        a: renderMarkdownLink,
        img: renderMarkdownImage,
        blockquote: renderMarkdownBlockquote,
      }}
    />
  );
};
