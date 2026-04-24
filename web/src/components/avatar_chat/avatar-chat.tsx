import { useEffect, useRef } from 'react'
import {
  ArrowUpIcon,
  BotIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'

import { AvatarChatMessageItem } from '@/components/avatar_chat/avatar-chat-message'
import {
  avatarChatContract,
  useAvatarChat,
} from '@/components/avatar_chat/use-avatar-chat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type AvatarChatProps = {
  /** Runtime endpoint label and request target. */
  endpoint: string
  /** Shared error dialog callback. */
  onError: (title: string, message: string) => void
}

type WelcomePanelProps = {
  /** Welcome prompt click handler that submits a prompt immediately. */
  onPromptClick: (query: string) => Promise<void>
}

/** Local shadcn/ui + react-markdown chat surface for `/ChatTest`. */
export function AvatarChat({ endpoint, onError }: AvatarChatProps) {
  const {
    canRegenerate,
    draft,
    isLoading,
    isUploading,
    lastAssistantMessageId,
    messages,
    pendingAttachments,
    remainingCharacters,
    removePendingAttachment,
    setDraft,
    startNewConversation,
    stop,
    submit,
    uploadFiles,
    regenerate,
  } = useAvatarChat({ endpoint, onError })

  const listRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, isLoading])

  return (
    <Card className="flex h-full min-h-0 flex-col border shadow-none">
      <CardHeader className="gap-3 border-b">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-secondary/60 text-foreground">
            <BotIcon />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Local chat panel</CardTitle>
            <CardDescription>
              Requests stream directly from{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{endpoint}</code>
              .
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 py-4">
        <div
          ref={listRef}
          className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-xl border bg-background p-4"
        >
          {messages.length === 0 ? (
            <AvatarChatWelcomePanel onPromptClick={submit} />
          ) : (
            messages.map((message) => (
              <AvatarChatMessageItem
                key={message.id}
                isLatestAssistant={message.id === lastAssistantMessageId}
                isLoading={isLoading}
                message={message}
                onRegenerate={regenerate}
                onStop={stop}
              />
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">single session</Badge>
            <span>Stored locally in this browser.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={startNewConversation}
            >
              <PlusIcon data-icon="inline-start" />
              New conversation
            </Button>

            {canRegenerate && !isLoading ? (
              <Button variant="ghost" size="sm" onClick={regenerate}>
                <SparklesIcon data-icon="inline-start" />
                Regenerate last answer
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-stretch gap-4 border-t bg-muted/30">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                disabled={isLoading || isUploading}
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon data-icon="inline-start" />
                Add files
              </Button>
              {isUploading ? (
                <Badge variant="outline">
                  <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  Uploading
                </Badge>
              ) : null}
            </div>

            <input
              ref={fileInputRef}
              className="hidden"
              multiple
              type="file"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length > 0) {
                  void uploadFiles(files)
                }
                event.target.value = ''
              }}
            />
          </div>

          {pendingAttachments.length > 0 ? (
            <div className="grid gap-3 rounded-xl border bg-background p-3 sm:grid-cols-2">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{attachment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      className="rounded-full"
                      type="button"
                      onClick={() => removePendingAttachment(attachment.id)}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>

                  {attachment.mediaKind === 'image' ? (
                    <img
                      alt={attachment.name}
                      className="max-h-48 rounded-lg border object-contain"
                      src={attachment.previewUrl}
                    />
                  ) : null}

                  {attachment.mediaKind === 'audio' ? (
                    <audio className="w-full" controls src={attachment.previewUrl} />
                  ) : null}

                  {attachment.mediaKind === 'video' ? (
                    <video className="max-h-48 w-full rounded-lg border" controls src={attachment.previewUrl} />
                  ) : null}

                  {attachment.mediaKind === 'file' ? (
                    <Badge className="w-fit" variant="secondary">
                      File ready to upload
                    </Badge>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <label className="sr-only" htmlFor="avatar-chat-test-input">
            Chat message
          </label>
          <textarea
            id="avatar-chat-test-input"
            className="min-h-24 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading || isUploading}
            maxLength={avatarChatContract.maxLength}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !isUploading) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder={avatarChatContract.placeholder}
            value={draft}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-muted-foreground">
              {avatarChatContract.disclaimer}
            </p>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{remainingCharacters} left</Badge>
              {isLoading ? (
                <Button variant="outline" onClick={stop}>
                  Stop
                </Button>
              ) : (
                <Button disabled={isUploading} onClick={() => void submit()}>
                  <ArrowUpIcon data-icon="inline-start" />
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

/** Welcome state shown before the first locally persisted message exists. */
function AvatarChatWelcomePanel({ onPromptClick }: WelcomePanelProps) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border bg-secondary/60 text-foreground">
            <SparklesIcon />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-sm text-muted-foreground">{avatarChatContract.welcome.nick}</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {avatarChatContract.welcome.greeting}
            </h2>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          {avatarChatContract.welcome.description}
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        {avatarChatContract.welcome.prompts.map((prompt) => (
          <Button
            key={prompt.value}
            className="justify-start text-left"
            variant="outline"
            onClick={() => void onPromptClick(prompt.value)}
          >
            <SparklesIcon data-icon="inline-start" />
            {prompt.value}
          </Button>
        ))}
      </div>
    </div>
  )
}
