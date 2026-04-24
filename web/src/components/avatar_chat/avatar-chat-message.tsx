import ReactMarkdown from 'react-markdown'
import { BotIcon, RefreshCcwIcon, SquareIcon, UserIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  getFileSystemDownloadUrl,
  getFileSystemPreviewUrl,
} from '@/lib/file-system-api'
import { cn } from '@/lib/utils'
import {
  AgentScopeRuntimeContentType,
  type AgentScopeRuntimeContent,
  type AgentScopeRuntimeMessage,
  AgentScopeRuntimeMessageType,
  type AvatarChatAttachment,
  type AvatarChatMessage,
  AvatarChatMessageStatus,
} from '@/components/avatar_chat/types'

type AvatarChatMessageProps = {
  /** Whether this bubble is the latest assistant message. */
  isLatestAssistant: boolean
  /** Callback used to regenerate the latest answer. */
  onRegenerate: () => void
  /** Callback used to stop the active request. */
  onStop: () => void
  /** Local message payload to render. */
  message: AvatarChatMessage
  /** Whether a request is currently streaming. */
  isLoading: boolean
}

/** Renders one local chat bubble with markdown and per-message controls. */
export function AvatarChatMessageItem({
  isLatestAssistant,
  onRegenerate,
  onStop,
  message,
  isLoading,
}: AvatarChatMessageProps) {
  const isAssistant = message.role === 'assistant'
  const isGenerating = message.status === AvatarChatMessageStatus.Generating
  const showRegenerate =
    isAssistant &&
    isLatestAssistant &&
    !isLoading &&
    message.status !== AvatarChatMessageStatus.Generating
  const showStop = isAssistant && isGenerating && isLatestAssistant && isLoading

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3',
        !isAssistant && 'justify-end',
      )}
    >
      {isAssistant ? <AvatarGlyph isAssistant /> : null}

      <div className={cn('flex max-w-3xl flex-col gap-2', !isAssistant && 'items-end')}>
        <div className="flex items-center gap-2">
          <Badge variant={isAssistant ? 'secondary' : 'outline'}>
            {isAssistant ? 'Avatar' : 'You'}
          </Badge>
          <StatusBadge status={message.status} />
        </div>

        <Card
          className={cn(
            'w-full border shadow-none',
            isAssistant ? 'bg-card' : 'bg-secondary/60',
          )}
        >
          <CardContent className="flex flex-col gap-4 py-4">
            <div className="text-sm leading-7 text-foreground">
              {isAssistant ? (
                <AssistantRuntimeContent
                  isGenerating={isGenerating}
                  message={message}
                />
              ) : (
                <UserMessageContent message={message} />
              )}
            </div>

            {(showRegenerate || showStop) && (
              <div className="flex items-center gap-2">
                {showStop ? (
                  <Button variant="outline" size="sm" onClick={onStop}>
                    <SquareIcon data-icon="inline-start" />
                    Stop
                  </Button>
                ) : null}
                {showRegenerate ? (
                  <Button variant="outline" size="sm" onClick={onRegenerate}>
                    <RefreshCcwIcon data-icon="inline-start" />
                    Regenerate
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!isAssistant ? <AvatarGlyph isAssistant={false} /> : null}
    </div>
  )
}

function UserMessageContent({ message }: { message: AvatarChatMessage }) {
  const attachments = Array.isArray(message.attachments) ? message.attachments : []

  return (
    <div className="flex flex-col gap-3">
      {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
      {attachments.length > 0 ? <UserAttachmentList attachments={attachments} /> : null}
    </div>
  )
}

function UserAttachmentList({ attachments }: { attachments: AvatarChatAttachment[] }) {
  return (
    <div className="flex flex-col gap-3">
      {attachments.map((attachment) => (
        <UserAttachmentItem key={attachment.relativePath} attachment={attachment} />
      ))}
    </div>
  )
}

function UserAttachmentItem({ attachment }: { attachment: AvatarChatAttachment }) {
  const previewUrl = getFileSystemPreviewUrl(attachment.relativePath)
  const downloadUrl = getFileSystemDownloadUrl(attachment.relativePath)

  if (attachment.mediaKind === 'image') {
    return (
      <a href={previewUrl} rel="noreferrer" target="_blank">
        <img
          alt={attachment.name}
          className="max-h-64 rounded-xl border object-contain"
          src={previewUrl}
        />
      </a>
    )
  }

  if (attachment.mediaKind === 'audio') {
    return <audio className="w-full" controls src={previewUrl} />
  }

  if (attachment.mediaKind === 'video') {
    return <video className="max-h-80 w-full rounded-xl border" controls src={previewUrl} />
  }

  return (
    <a
      className="text-sm text-primary underline underline-offset-4"
      href={downloadUrl}
      rel="noreferrer"
      target="_blank"
    >
      {attachment.name}
    </a>
  )
}

function AvatarGlyph({ isAssistant }: { isAssistant: boolean }) {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background text-foreground">
      {isAssistant ? <BotIcon /> : <UserIcon />}
    </div>
  )
}

function AssistantRuntimeContent({
  isGenerating,
  message,
}: {
  isGenerating: boolean
  message: AvatarChatMessage
}) {
  const runtimeOutput = Array.isArray(message.runtimeResponse?.output)
    ? message.runtimeResponse.output
    : []

  if (runtimeOutput.length === 0) {
    return <MarkdownBlock content={message.text || (isGenerating ? '...' : 'No response content.')} />
  }

  return (
    <div className="flex flex-col gap-4">
      {runtimeOutput.map((runtimeMessage) => (
        <RuntimeMessageBlock key={runtimeMessage.id} message={runtimeMessage} />
      ))}
    </div>
  )
}

function RuntimeMessageBlock({ message }: { message: AgentScopeRuntimeMessage }) {
  const content = Array.isArray(message.content) ? message.content : []

  if (message.type === AgentScopeRuntimeMessageType.Error) {
    return <MarkdownBlock content={message.message || 'Runtime error.'} />
  }

  if (message.type === AgentScopeRuntimeMessageType.Reasoning) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Reasoning
        </p>
        <RuntimeContentList content={content} />
      </div>
    )
  }

  if (message.type !== AgentScopeRuntimeMessageType.Message) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {message.type.replaceAll('_', ' ')}
        </p>
        <RuntimeContentList content={content} />
      </div>
    )
  }

  return <RuntimeContentList content={content} />
}

function RuntimeContentList({ content }: { content: AgentScopeRuntimeContent[] }) {
  return (
    <div className="flex flex-col gap-3">
      {content.map((item, index) => (
        <RuntimeContentItem key={`${item.type}-${index}`} content={item} />
      ))}
    </div>
  )
}

function RuntimeContentItem({ content }: { content: AgentScopeRuntimeContent }) {
  if (content.type === AgentScopeRuntimeContentType.Text) {
    return <MarkdownBlock content={content.text} />
  }

  if (content.type === AgentScopeRuntimeContentType.Refusal) {
    return <MarkdownBlock content={content.refusal} />
  }

  if (content.type === AgentScopeRuntimeContentType.Image) {
    return (
      <div className="flex flex-col gap-2">
        <img
          alt="Runtime output"
          className="max-h-80 rounded-xl border object-contain"
          src={content.image_url}
        />
        <a
          className="text-xs text-primary underline underline-offset-4"
          href={content.image_url}
          rel="noreferrer"
          target="_blank"
        >
          Open image
        </a>
      </div>
    )
  }

  if (content.type === AgentScopeRuntimeContentType.Audio) {
    if (!content.audio_url) {
      return null
    }

    return <audio className="w-full" controls src={content.audio_url} />
  }

  if (content.type === AgentScopeRuntimeContentType.Video) {
    return (
      <video
        className="max-h-80 w-full rounded-xl border"
        controls
        poster={content.video_poster}
        src={content.video_url}
      />
    )
  }

  if (content.type === AgentScopeRuntimeContentType.File) {
    const href = content.file_url
    const label = content.file_name || content.fileName || 'Download file'

    return href ? (
      <a
        className="text-sm text-primary underline underline-offset-4"
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
    ) : (
      <p className="text-sm text-muted-foreground">{label}</p>
    )
  }

  return (
    <pre className="overflow-x-auto rounded-xl border bg-muted/60 p-3 text-xs">
      {JSON.stringify(
        content.type === AgentScopeRuntimeContentType.Data ? content.data : content,
        null,
        2,
      )}
    </pre>
  )
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ className, ...props }) => (
          <a
            className={cn('text-primary underline underline-offset-4', className)}
            rel="noreferrer"
            target="_blank"
            {...props}
          />
        ),
        code: ({ className, children, ...props }) => (
          <code
            className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-xs', className)}
            {...props}
          >
            {children}
          </code>
        ),
        li: ({ className, ...props }) => (
          <li className={cn('ml-5 list-disc', className)} {...props} />
        ),
        ol: ({ className, ...props }) => (
          <ol className={cn('flex flex-col gap-2', className)} {...props} />
        ),
        p: ({ className, ...props }) => (
          <p className={cn('whitespace-pre-wrap', className)} {...props} />
        ),
        pre: ({ className, ...props }) => (
          <pre
            className={cn('overflow-x-auto rounded-xl border bg-muted/60 p-3 text-xs', className)}
            {...props}
          />
        ),
        ul: ({ className, ...props }) => (
          <ul className={cn('flex flex-col gap-2', className)} {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function StatusBadge({ status }: { status: AvatarChatMessageStatus }) {
  if (status === AvatarChatMessageStatus.Generating) {
    return <Badge variant="outline">Streaming</Badge>
  }

  if (status === AvatarChatMessageStatus.Interrupted) {
    return <Badge variant="outline">Stopped</Badge>
  }

  if (status === AvatarChatMessageStatus.Error) {
    return <Badge variant="destructive">Error</Badge>
  }

  return null
}
