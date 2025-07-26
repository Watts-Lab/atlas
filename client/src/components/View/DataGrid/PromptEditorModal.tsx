import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Settings, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PromptEditorModalProps {
  currentPrompt: string
  isOpen: boolean
  onClose: () => void
  onSave: (newPrompt: string) => Promise<void>
  isLoading?: boolean
}

const PromptEditorModal = ({
  currentPrompt,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
}: PromptEditorModalProps) => {
  const [prompt, setPrompt] = useState(currentPrompt)
  const [isSaving, setIsSaving] = useState(false)

  const defaultPrompt = `You are a research assistant for a team of scientists tasked with research cartography. You are given a PDF of the paper and are asked to provide a summary of the key findings. Your response should be in JSON format. Just provide the JSON response without any additional text. Do not include \`\`\`json or any other formatting.`

  useEffect(() => {
    setPrompt(currentPrompt)
  }, [currentPrompt])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(prompt)
      toast.success('Prompt updated')
      onClose()
    } catch {
      toast.error('Failed to update')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setPrompt(currentPrompt)
    onClose()
  }

  const handleReset = () => {
    setPrompt(defaultPrompt)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <Button variant='outline' disabled={isLoading}>
          <Settings className='w-4 h-4 mr-2' />
          Assistant Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl max-h-[80vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Edit Assistant Prompt</DialogTitle>
          <DialogDescription>
            Customize the instructions given to the AI assistant when processing papers. This
            affects how the assistant extracts and interprets features from your documents.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 space-y-4 overflow-y-auto'>
          <div className='space-y-2'>
            <Label htmlFor='prompt-editor'>Assistant Instructions</Label>
            <Textarea
              id='prompt-editor'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Enter custom instructions for the AI assistant...'
              className='min-h-[300px] resize-none'
              disabled={isSaving}
            />
            <p className='text-sm text-muted-foreground'>{prompt.length} characters</p>
          </div>

          <div className='p-4 bg-muted rounded-lg'>
            <h4 className='font-medium mb-2'>Tips for effective prompts:</h4>
            <ul className='text-sm text-muted-foreground space-y-1'>
              <li>• Be specific about the format you want (JSON, structured data, etc.)</li>
              <li>• Include instructions about handling edge cases or missing data</li>
              <li>• Specify the level of detail needed for extracted features</li>
              <li>• Consider mentioning the scientific domain or paper types</li>
            </ul>
          </div>
        </div>

        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={handleReset} disabled={isSaving}>
            Reset to Default
          </Button>
          <Button variant='outline' onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !prompt.trim()}>
            {isSaving && <Loader2 className='w-4 h-4 mr-2 animate-spin' />}
            Save Prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PromptEditorModal
