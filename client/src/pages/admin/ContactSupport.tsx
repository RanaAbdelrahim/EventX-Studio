import { useState } from 'react'

export default function ContactSupport() {
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, send this to your support backend
    console.log({ subject, message })
    setSubmitted(true)
    setSubject('')
    setMessage('')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
      
      {submitted ? (
        <div className="card bg-green-50">
          <div className="text-center py-4">
            <div className="text-5xl mb-2">✅</div>
            <h3 className="text-xl font-medium mb-2">Support Request Received</h3>
            <p className="text-gray-600 mb-4">
              Thank you for contacting support. We'll respond to your inquiry shortly.
            </p>
            <button 
              className="btn"
              onClick={() => setSubmitted(false)}
            >
              Send Another Request
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Subject</label>
              <input
                type="text"
                className="input"
                placeholder="How can we help you?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm mb-1">Message</label>
              <textarea
                className="input min-h-[150px]"
                placeholder="Describe your issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
            
            <div className="pt-2">
              <button type="submit" className="btn">Submit Request</button>
            </div>
          </form>
        </div>
      )}
      
      <div className="mt-6 card bg-zinc-50">
        <h3 className="font-medium mb-2">Common Questions</h3>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-sm">How do I export event data?</h4>
            <p className="text-sm text-gray-600">
              Go to Analytics & Reports and use the export button in the top right corner.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm">How do I issue refunds?</h4>
            <p className="text-sm text-gray-600">
              Go to Booking & Tickets, find the relevant booking, and click "Refund" in the actions menu.
            </p>
          </div>
          <div>
            <h4 className="font-medium text-sm">How do I add custom fields to registration?</h4>
            <p className="text-sm text-gray-600">
              Navigate to Settings → Registration and add your custom fields there.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
