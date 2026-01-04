'use client'

import { useState } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
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

  return (
    <div className="relative rounded-lg overflow-hidden border bg-[#1e1e1e]">
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#252525]">
          <span className="text-xs text-gray-400 font-mono">{filename}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-white hover:bg-[#333]"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}
      <div className="relative">
        {!filename && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6 text-gray-400 hover:text-white hover:bg-[#333] z-10"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
        <Highlight theme={themes.vsDark} code={code.trim()} language={language}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn('p-4 overflow-x-auto text-sm', className)}
              style={{ ...style, margin: 0, background: 'transparent' }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {showLineNumbers && (
                    <span className="inline-block w-8 text-gray-500 text-right mr-4 select-none">
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
