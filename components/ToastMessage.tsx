import { Toast } from './Toast'

interface Props {
  message: string
  visible: boolean
  type?: 'success' | 'error'
  onHide?: () => void
}

export default function ToastMessage({ message, visible, type = 'success', onHide }: Props) {
  return (
    <Toast
      melding={message}
      synlig={visible}
      type={type === 'error' ? 'feil' : 'suksess'}
      onHide={onHide}
    />
  )
}
