'use client'

import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { Button } from '@/components/ui/button'
import { Check, Copy, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isTerminal = language === 'bash' || language === 'shell' || filename === 'Terminal'

  return (
    <div className="relative rounded-xl overflow-hidden border bg-[#0d1117]">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#21262d] bg-[#161b22]">
          <div className="flex items-center gap-2">
            {isTerminal && <Terminal className="h-3.5 w-3.5 text-gray-500" />}
            <span className="text-xs text-gray-400 font-mono">{filename}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 transition-colors',
              copied
                ? 'text-emerald-400 hover:text-emerald-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]'
            )}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-2 h-7 w-7 z-10 transition-colors',
              copied
                ? 'text-emerald-400 hover:text-emerald-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]'
            )}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn('p-4 overflow-x-auto text-[13px] leading-relaxed', className)}
              style={{ ...style, margin: 0, background: 'transparent' }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {showLineNumbers && (
                    <span className="inline-block w-8 text-gray-600 text-right mr-4 select-none text-xs">
                      {i + 1}
                    </span>
                  )}
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}
