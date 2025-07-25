import { useEffect, useRef, useState } from 'react'
import {
  createCall,
  listenForAnswer,
  setAnswer,
  addIceCandidate,
  listenForIceCandidates,
} from './utils/signaling'
import { doc, DocumentData, getDoc } from 'firebase/firestore'
import { db } from './utils/firebase'
import PermissionsDrawer from './components/PermissionsDrawer'
import { toast } from 'sonner'
import CallControls from './components/CallControls'
import useChatStore from './store/core'
import RemoteVideo from './components/RemoteVideo'
import Navbar from './components/Navbar'
import VideoPreview from './components/VideoPreview'
import SelfVideo from './components/SelfVideo'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import DroppableZones from './components/DroppableZones'

const App = () => {
  const {
    status,
    isCameraOn,
    setIsInitialized,
    callId,
    setCallId,
    joinId,
    setRole,
    setStatus,
    setIsRemoteStreamActive,
    setIsPermissionGranted,
  } = useChatStore()

  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const selfVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const [parent, setParent] = useState<string>('video-preview-4')

  // ICE listeners cleanup
  const iceUnsubs = useRef<(() => void)[]>([])
  const answerUnsub = useRef<null | (() => void)>(null)

  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const initialize = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
      previewVideoRef.current!.srcObject = stream
      selfVideoRef.current!.srcObject = stream
      setLocalStream(stream)
      setIsInitialized(true)
    } catch (error) {
      console.log(error)
      setIsPermissionGranted(false)
    }
  }

  // OFFERER: Start a call
  const startCall = async () => {
    setRole('offer')
    setStatus('Hosting')
    const pc = new RTCPeerConnection()
    const remote = new MediaStream()
    remoteVideoRef.current!.srcObject = remote

    // Add local tracks
    localStream!.getTracks().forEach((track) => {
      pc.addTrack(track, localStream!)
    })

    // On remote track
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track)
      })
      setIsRemoteStreamActive(true)
    }

    // On ICE connection state change
    pc.oniceconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        setIsRemoteStreamActive(false)
      }
    }

    // Create offer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    // Store offer in Firestore
    const { callId: newCallId } = await createCall(offer)
    setCallId(newCallId)
    toast.success('Call created! Share the Call ID with your friend.')
    setStatus('Waiting')

    // On ICE candidate
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addIceCandidate(callId, event.candidate.toJSON(), 'offer')
      }
    }

    // Listen for answer
    answerUnsub.current = listenForAnswer(newCallId, {
      onAnswer: async (answer) => {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        toast.success('A guest has joined the call!')
        setStatus('Connected')
      },
    })

    // Listen for answerer's ICE candidates
    iceUnsubs.current.push(
      listenForIceCandidates(newCallId, 'answer', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
      }),
    )
  }

  // ANSWERER: Join a call
  const joinCall = async () => {
    setRole('answer')
    setStatus('Joining')
    const pc = new RTCPeerConnection()
    const remote = new MediaStream()
    remoteVideoRef.current!.srcObject = remote

    // Add local tracks
    localStream!.getTracks().forEach((track) => {
      pc.addTrack(track, localStream!)
    })

    // On remote track
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remote.addTrack(track)
      })
      setIsRemoteStreamActive(true)
    }

    // On ICE candidate
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await addIceCandidate(joinId, event.candidate.toJSON(), 'answer')
      }
    }

    // Fetch offer from Firestore
    const docRef = doc(db, 'calls', joinId)
    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      setStatus('NotFound')
      toast.error('Call not found! Please check the call ID.')
      setRole(null)
      return
    }
    const data: DocumentData = docSnap.data() as DocumentData
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
    // Create answer
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await setAnswer(joinId, answer)
    setCallId(joinId)
    toast.success('You have joined the call!')
    setStatus('Connected')

    // Listen for offerer's ICE candidates
    iceUnsubs.current.push(
      listenForIceCandidates(joinId, 'offer', (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate))
      }),
    )
  }

  useEffect(() => {
    initialize()

    const unsubs = iceUnsubs.current
    return () => {
      unsubs.forEach((unsub) => unsub())
      if (answerUnsub.current) answerUnsub.current()
    }
  }, [])

  useEffect(() => {
    if (isCameraOn) {
      if (status === 'Connected') {
        selfVideoRef.current!.srcObject = localStream!
      } else {
        previewVideoRef.current!.srcObject = localStream!
      }
    }
  }, [isCameraOn, localStream])

  const handleDragEnd = (event: DragEndEvent) => {
    setParent(event.over ? (event.over.id as string) : 'video-preview-4')
  }

  const draggable = <SelfVideo selfVideoRef={selfVideoRef} />

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
      <main className="flex flex-col items-center justify-center w-screen h-screen max-h-screen max-w-screen overflow-hidden">
        <Navbar />
        <VideoPreview previewVideoRef={previewVideoRef} startCall={startCall} joinCall={joinCall} />
        <RemoteVideo remoteVideoRef={remoteVideoRef} />
        <CallControls />
        <PermissionsDrawer />
        <DroppableZones parent={parent} draggable={draggable} />
      </main>
    </DndContext>
  )
}

export default App
