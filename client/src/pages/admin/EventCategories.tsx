import { useState } from 'react'

export default function EventCategories() {
  const [newCategory, setNewCategory] = useState('')
  
  const [categories, setCategories] = useState([
    { id: 1, name: 'Music', events: 8, color: '#8884d8' },
    { id: 2, name: 'Tech', events: 5, color: '#82ca9d' },
    { id: 3, name: 'Food', events: 3, color: '#ffc658' },
    { id: 4, name: 'Sports', events: 6, color: '#ff8042' },
    { id: 5, name: 'Arts', events: 4, color: '#8dd1e1' }
  ])

  const addCategory = () => {
    if (!newCategory.trim()) return
    
    setCategories([
      ...categories,
      {
        id: Date.now(),
        name: newCategory,
        events: 0,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
    ])
    
    setNewCategory('')
  }

  const deleteCategory = (id: number) => {
    setCategories(categories.filter(cat => cat.id !== id))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Event Categories</h2>
      
      <div className="card">
        <div className="flex gap-2 mb-6">
          <input 
            className="input flex-grow"
            placeholder="Add new category..."
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addCategory()}
          />
          <button className="btn" onClick={addCategory}>Add</button>
        </div>
        
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map(category => (
            <div 
              key={category.id} 
              className="p-4 rounded-lg border flex items-center justify-between"
              style={{ borderLeftColor: category.color, borderLeftWidth: 4 }}
            >
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-sm text-gray-500">{category.events} events</p>
              </div>
              <div className="flex gap-2">
                <button className="text-gray-400 hover:text-gray-600">✏️</button>
                <button 
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => deleteCategory(category.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
