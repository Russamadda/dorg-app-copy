import { Toast, type ToastLayoutPreset } from './Toast'

interface Props {
  message: string
  visible: boolean
  type?: 'success' | 'error'
  onHide?: () => void
  layoutPreset?: ToastLayoutPreset
}

export default function ToastMessage({
  message,
  visible,
  type = 'success',
  onHide,
  layoutPreset = 'floatingTabs',
}: Props) {
  return (
    <Toast
      melding={message}
      synlig={visible}
      type={type === 'error' ? 'feil' : 'suksess'}
      onHide={onHide}
      layoutPreset={layoutPreset}
    />
  )
}
