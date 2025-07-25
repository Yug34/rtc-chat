import { db } from './firebase'
import { generate } from 'random-words'
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  QuerySnapshot,
  DocumentChange,
  DocumentSnapshot,
  setDoc,
} from 'firebase/firestore'

// Collection for calls
type Candidate = RTCIceCandidateInit

type Callbacks = {
  onAnswer?: (answer: RTCSessionDescriptionInit) => void
  onCandidate?: (candidate: Candidate) => void
}

export const createCall = async (offer: RTCSessionDescriptionInit) => {
  const callId = generate({ min: 2, max: 10, join: '-', exactly: 3 })
  const callDoc = doc(db, 'calls', callId)
  await setDoc(callDoc, { offer })

  const candidatesCollection = collection(callDoc, 'candidates')
  return { callId, candidatesCollection, callDoc }
}

export const listenForAnswer = (callId: string, { onAnswer }: Callbacks) => {
  const callRef = doc(db, 'calls', callId)
  return onSnapshot(callRef, (snapshot: DocumentSnapshot) => {
    const data = snapshot.data()
    if (data?.answer && onAnswer) {
      onAnswer(data.answer)
    }
  })
}

export const setAnswer = async (callId: string, answer: RTCSessionDescriptionInit) => {
  const callRef = doc(db, 'calls', callId)
  await updateDoc(callRef, { answer })
}

export const addIceCandidate = async (
  callId: string,
  candidate: Candidate,
  role: 'offer' | 'answer',
) => {
  const candidatesRef = collection(db, 'calls', callId, `${role}Candidates`)
  await addDoc(candidatesRef, candidate)
}

export const listenForIceCandidates = (
  callId: string,
  role: 'offer' | 'answer',
  cb: (candidate: Candidate) => void,
) => {
  const candidatesRef = collection(db, 'calls', callId, `${role}Candidates`)
  return onSnapshot(candidatesRef, (snapshot: QuerySnapshot) => {
    snapshot.docChanges().forEach((change: DocumentChange) => {
      if (change.type === 'added') {
        cb(change.doc.data() as Candidate)
      }
    })
  })
}

export const cleanupCall = async (callId: string) => {
  const callRef = doc(db, 'calls', callId)
  await deleteDoc(callRef)
}
