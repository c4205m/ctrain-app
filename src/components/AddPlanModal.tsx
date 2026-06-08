import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../db/db'
import Input from './Input'
import Button from './Button'
import { toast } from 'sonner'

interface AddPlanModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddPlanModal({ isOpen, onClose }: AddPlanModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  function handleCreate() {
    if (!name.trim()) return
    onClose()
    setName('')
    setDescription('')
    db.plans.add({
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      createdAt: new Date().toISOString(),
      exercises: [],
      duration: 0,
    }).catch(() => toast.error('Failed to create plan'))
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-6">New Plan</h2>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Name</div>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Day" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Description (optional)</div>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this plan for?" />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" disabled={!name.trim()} onClick={handleCreate}>
                  Create Plan
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
