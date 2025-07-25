import { Card } from './ui/card'
import CallCreation from './CallCreation'
import { Toggle } from './ui/toggle'
import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import useChatStore from '@/store/core'

interface VideoPreviewProps {
  previewVideoRef: React.RefObject<HTMLVideoElement | null>
  startCall: () => void
  joinCall: () => void
}

const VideoPreview = ({ previewVideoRef, startCall, joinCall }: VideoPreviewProps) => {
  const { isMicOn, setIsMicOn, isCameraOn, setIsCameraOn, status } = useChatStore()
  const toggleMic = () => setIsMicOn(!isMicOn)
  const toggleCamera = () => setIsCameraOn(!isCameraOn)

  if (status === 'Connected') {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <Card className="flex flex-row items-center justify-center w-fit max-h-[448px] gap-6 p-6 shadow-none">
        <div
          className={
            'w-[400px] h-[400px] bg-transparent rounded-l-xl rounded-r-none border border-gray-400'
          }
        >
          {isCameraOn ? (
            <video
              className="w-full h-full bg-black rounded-l-xl rounded-r-none"
              ref={previewVideoRef}
              autoPlay
              playsInline
            />
          ) : (
            <div className="w-full h-full bg-[#202124] text-white rounded-l-xl rounded-r-none flex flex-col items-center justify-center">
              <span className="text-lg font-bold">No camera</span>
              <span className="text-md">
                Just a ✨ <span className="italic">beautiful</span> ✨ human
              </span>
            </div>
          )}
          <div className="relative bottom-[48px] left-0 w-full h-10 rounded-xl z-20 bg-transparent">
            <div className="flex items-center justify-center w-full h-full rounded-xl gap-x-2 py-2">
              <Toggle
                className="cursor-pointer z-30"
                variant="outline"
                aria-label="Toggle Microphone"
                onClick={toggleMic}
              >
                {isMicOn ? <Mic /> : <MicOff className="text-red-500" />}
              </Toggle>
              <Toggle
                className="cursor-pointer z-30"
                variant="outline"
                aria-label="Toggle Camera"
                onClick={toggleCamera}
              >
                {isCameraOn ? <Video /> : <VideoOff className="text-red-500" />}
              </Toggle>
            </div>
          </div>
        </div>
        <span className="w-[1px] h-full bg-gray-400"></span>
        <CallCreation startCall={startCall} joinCall={joinCall} />
      </Card>
    </div>
  )
}

export default VideoPreview
