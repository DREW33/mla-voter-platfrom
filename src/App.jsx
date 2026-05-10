import { useState, useEffect } from 'react'
import { sampleMLAs, assamDistricts, issueCategories } from './data/mlaData'

function App() {
  const [activeTab, setActiveTab] = useState('problems')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [currentMLA, setCurrentMLA] = useState(() => {
    const saved = localStorage.getItem('current-mla')
    return saved ? JSON.parse(saved) : null
  })
  const [mlaSelectModal, setMlaSelectModal] = useState(false)
  const [problems, setProblems] = useState(() => {
    const saved = localStorage.getItem('assam-problems')
    return saved ? JSON.parse(saved) : []
  })
  const [showProblemModal, setShowProblemModal] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(null)
  const [toast, setToast] = useState(null)
  const [problemForm, setProblemForm] = useState({ title: '', description: '', category: '', district: '', mlaId: '', photo: '' })
  const [ratingForm, setRatingForm] = useState({ rating: 0, comment: '' })
  const [completionForm, setCompletionForm] = useState({ photo: '', description: '' })
  const [ipAddress, setIpAddress] = useState(() => localStorage.getItem('user-ip') || '')

  useEffect(() => {
    if (!ipAddress) {
      fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => {
          setIpAddress(data.ip)
          localStorage.setItem('user-ip', data.ip)
        })
        .catch(() => {
          const tempIP = 'local-' + Date.now()
          setIpAddress(tempIP)
          localStorage.setItem('user-ip', tempIP)
        })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('assam-problems', JSON.stringify(problems))
  }, [problems])

  useEffect(() => {
    if (currentMLA) {
      localStorage.setItem('current-mla', JSON.stringify(currentMLA))
    } else {
      localStorage.removeItem('current-mla')
    }
  }, [currentMLA])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getMLAStats = (mlaId) => {
    const mlaProblems = problems.filter(p => p.mlaId == mlaId)
    const solved = mlaProblems.filter(p => p.status === 'resolved').length
    const pending = mlaProblems.filter(p => p.status === 'pending').length
    const inProgress = mlaProblems.filter(p => p.status === 'in_progress').length
    return { total: mlaProblems.length, solved, pending, inProgress }
  }

  const filteredProblems = problems.filter(problem => {
    if (filterDistrict && problem.district !== filterDistrict) return false
    if (filterCategory && problem.category !== filterCategory) return false
    if (filterStatus && problem.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return problem.title.toLowerCase().includes(query) || 
             problem.description.toLowerCase().includes(query) ||
             problem.district.toLowerCase().includes(query)
    }
    if (currentMLA && activeTab === 'mla-portal') {
      return problem.mlaId == currentMLA.id
    }
    return true
  })

  const canRateProblem = (problemId) => {
    const problem = problems.find(p => p.id === problemId)
    return !problem?.ratings?.some(r => r.ip === ipAddress)
  }

  const handleProblemSubmit = () => {
    if (!problemForm.title || !problemForm.category || !problemForm.district || !problemForm.photo) {
      showToast('Please fill required fields and upload photo', 'error')
      return
    }

    const newProblem = {
      ...problemForm,
      id: Date.now(),
      ip: ipAddress,
      date: new Date().toISOString(),
      status: 'pending',
      completionPhoto: '',
      completionDescription: '',
      ratings: []
    }

    setProblems([newProblem, ...problems])
    setShowProblemModal(false)
    setProblemForm({ title: '', description: '', category: '', district: '', mlaId: '', photo: '' })
    showToast('Problem reported successfully!')
  }

  const handleProblemRatingSubmit = (problemId) => {
    if (ratingForm.rating === 0) {
      showToast('Please select a rating', 'error')
      return
    }

    const problem = problems.find(p => p.id === problemId)
    if (!problem) return

    if (problem.ratings?.some(r => r.ip === ipAddress)) {
      showToast('You have already rated this problem', 'error')
      return
    }

    const newRating = {
      rating: ratingForm.rating,
      comment: ratingForm.comment,
      ip: ipAddress,
      date: new Date().toISOString()
    }

    setProblems(problems.map(p => 
      p.id === problemId 
        ? { ...p, ratings: [...(p.ratings || []), newRating] }
        : p
    ))

    setShowRatingModal(false)
    setRatingForm({ rating: 0, comment: '' })
    showToast('Problem rated! (One rating per IP)')
  }

  const handleMLACompletionSubmit = (problemId) => {
    if (!completionForm.photo) {
      showToast('Please upload completion photo', 'error')
      return
    }

    setProblems(problems.map(problem =>
      problem.id === problemId
        ? { ...problem, completionPhoto: completionForm.photo, completionDescription: completionForm.description, status: 'resolved', resolvedDate: new Date().toISOString() }
        : problem
    ))

    setShowCompletionModal(null)
    setCompletionForm({ photo: '', description: '' })
    showToast('Problem marked as solved! 📸')
  }

  const handlePhotoUpload = (e, onUpload) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        onUpload(event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const getMLAById = (id) => sampleMLAs.find(m => m.id == id)

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className={interactive ? 'rating-input' : 'stars'}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? '' : 'empty'}`}
            onClick={() => interactive && onRate && onRate(star)}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  const MLAProblemsCount = currentMLA ? problems.filter(p => p.mlaId == currentMLA.id).length : 0

  return (
    <>
      <header className="header">
        <div className="header-content">
          <a href="#" className="logo">
            <div className="logo-icon">🇮🇳</div>
            <span className="logo-text">Assam Voter</span>
          </a>
          <nav className="nav-links">
            <a className={`nav-link ${activeTab === 'problems' ? 'active' : ''}`} onClick={() => setActiveTab('problems')}>📍 Problems</a>
            <a className={`nav-link ${activeTab === 'solved' ? 'active' : ''}`} onClick={() => setActiveTab('solved')}>✅ Solved</a>
            <a className={`nav-link ${activeTab === 'mla' ? 'active' : ''}`} onClick={() => setActiveTab('mla')}>🏛️ MLA</a>
            {currentMLA && <a className={`nav-link ${activeTab === 'mla-portal' ? 'active' : ''}`} onClick={() => setActiveTab('mla-portal')}>👤 MLA Portal</a>}
            {!currentMLA && <a className="nav-link" onClick={() => setMlaSelectModal(true)}>🔐 MLA Login</a>}
            {currentMLA && <a className="nav-link" onClick={() => setCurrentMLA(null)}>🚪 Logout</a>}
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="app-container">
          {currentMLA ? (
            <div className="mla-welcome">
              <h1>Welcome, {currentMLA.name}</h1>
              <p>MLA of {currentMLA.constituency} | Problems assigned to you: {MLAProblemsCount}</p>
            </div>
          ) : (
            <>
              <h1>Assam Citizen Voice</h1>
              <p>Report local problems, track MLA work, and see what gets solved in your constituency</p>
            </>
          )}

          <div className="search-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search problems by title, area or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setShowProblemModal(true)}>+ Report Problem</button>
            </div>

            <div className="search-filters">
              <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
                <option value="">All Districts</option>
                {assamDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="">All Categories</option>
                {issueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Solved</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <main className="main-content app-container">
        {activeTab === 'problems' && (
          <>
            <div className="stats-bar">
              <span>📍 Pending: {problems.filter(p => p.status === 'pending').length}</span>
              <span>🔄 In Progress: {problems.filter(p => p.status === 'in_progress').length}</span>
              <span>✅ Solved: {problems.filter(p => p.status === 'resolved').length}</span>
            </div>

            {filteredProblems.filter(p => p.status !== 'resolved').length === 0 ? (
              <div className="empty-state">
                <h3>No Problems Found</h3>
                <p>Be the first to report a problem in your area</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowProblemModal(true)}>Report Problem</button>
              </div>
            ) : (
              <div className="problems-grid">
                {filteredProblems.filter(p => p.status !== 'resolved').map(problem => {
                  const mla = getMLAById(problem.mlaId)
                  const avgRating = problem.ratings?.length 
                    ? (problem.ratings.reduce((acc, r) => acc + r.rating, 0) / problem.ratings.length).toFixed(1)
                    : null
                  const isMyProblem = currentMLA && currentMLA.id == problem.mlaId
                  
                  return (
                    <div key={problem.id} className="problem-card">
                      <div className="problem-image-container">
                        <img src={problem.photo} alt="Problem" className="problem-image" />
                        <span className={`status-badge status-${problem.status}`}>
                          {problem.status === 'pending' ? '⏳ Pending' : '🔄 In Progress'}
                        </span>
                        {isMyProblem && <span className="your-problem-badge">Your Problem</span>}
                      </div>
                      <div className="problem-content">
                        <h3>{problem.title}</h3>
                        <p className="problem-description">{problem.description}</p>
                        <div className="problem-meta">
                          <span className="issue-tag">📍 {problem.district}</span>
                          <span className="issue-tag">🏷️ {problem.category}</span>
                          {mla && <span className="issue-tag">👤 {mla.name}</span>}
                        </div>
                        {avgRating && (
                          <div className="problem-rating">
                            {renderStars(Math.round(parseFloat(avgRating)))}
                            <span className="rating-count">({problem.ratings.length})</span>
                          </div>
                        )}
                        <div className="problem-actions">
                          {canRateProblem(problem.id) && !isMyProblem && (
                            <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedMLA({ id: problem.id, name: problem.title }); setShowRatingModal(true) }}>
                              ⭐ Rate
                            </button>
                          )}
                          {isMyProblem && problem.status !== 'resolved' && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowCompletionModal(problem.id)}>
                              📸 Mark Solved
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'solved' && (
          <>
            {problems.filter(p => p.status === 'resolved').length === 0 ? (
              <div className="empty-state">
                <h3>No Solved Problems Yet</h3>
                <p>Problems marked as resolved will appear here with before/after photos</p>
              </div>
            ) : (
              <div className="solved-grid">
                {problems.filter(p => p.status === 'resolved').map(problem => {
                  const mla = getMLAById(problem.mlaId)
                  return (
                    <div key={problem.id} className="solved-card">
                      <div className="before-after-comparison">
                        <div className="before-container">
                          <span className="label">Before</span>
                          <img src={problem.photo} alt="Before" className="comparison-image" />
                        </div>
                        <div className="arrow">➡️</div>
                        <div className="after-container">
                          <span className="label">After</span>
                          <img src={problem.completionPhoto} alt="After" className="comparison-image" />
                        </div>
                      </div>
                      <div className="solved-content">
                        <h3>{problem.title}</h3>
                        <p className="solved-description">{problem.completionDescription || 'Problem solved!'}</p>
                        <div className="problem-meta">
                          <span className="issue-tag">📍 {problem.district}</span>
                          <span className="issue-tag">🏷️ {problem.category}</span>
                          {mla && <span className="issue-tag">👤 {mla.name}</span>}
                        </div>
                        <div className="solved-date">
                          ✅ Solved on {new Date(problem.resolvedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'mla' && (
          <div className="mla-search">
            <input
              type="text"
              placeholder="Search MLA by name or constituency..."
              className="mla-search-input"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="mla-grid">
              {sampleMLAs.filter(m => {
                if (!searchQuery) return true
                const q = searchQuery.toLowerCase()
                return m.name.toLowerCase().includes(q) || m.constituency.toLowerCase().includes(q)
              }).slice(0, 50).map(mla => {
                const stats = getMLAStats(mla.id)
                return (
                  <div key={mla.id} className="mla-card">
                    <div className="mla-card-header">
                      <div className="mla-avatar">{mla.avatar}</div>
                      <div className="mla-info">
                        <h3>{mla.name}</h3>
                        <p className="mla-constituency">{mla.constituency}</p>
                        <p className="mla-district">{mla.district}</p>
                        <span className="mla-party">{mla.party}</span>
                      </div>
                    </div>
                    <div className="mla-stats">
                      <span>📍 {stats.total}</span>
                      <span>✅ {stats.solved}</span>
                      <span>⏳ {stats.pending}</span>
                    </div>
                    <div className="mla-card-actions">
                      <button className="btn btn-secondary" onClick={() => { setShowProblemModal(true); setProblemForm(p => ({ ...p, mlaId: mla.id })) }}>
                        Report Issue
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'mla-portal' && currentMLA && (
          <div className="mla-portal">
            <div className="portal-header">
              <h2>My Dashboard</h2>
              <p>Manage problems assigned to you</p>
            </div>
            <div className="portal-stats">
              <div className="stat-card">
                <span className="stat-number">{getMLAStats(currentMLA.id).total}</span>
                <span className="stat-label">Total Problems</span>
              </div>
              <div className="stat-card pending">
                <span className="stat-number">{getMLAStats(currentMLA.id).pending}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-card progress">
                <span className="stat-number">{getMLAStats(currentMLA.id).inProgress}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-card solved">
                <span className="stat-number">{getMLAStats(currentMLA.id).solved}</span>
                <span className="stat-label">Solved</span>
              </div>
            </div>
            <h3>Your Assigned Problems</h3>
            <div className="problems-grid">
              {problems.filter(p => p.mlaId == currentMLA.id).map(problem => (
                <div key={problem.id} className="problem-card">
                  <div className="problem-image-container">
                    <img src={problem.photo} alt="Problem" className="problem-image" />
                    <span className={`status-badge status-${problem.status}`}>
                      {problem.status === 'pending' ? '⏳ Pending' : problem.status === 'in_progress' ? '🔄 In Progress' : '✅ Solved'}
                    </span>
                  </div>
                  <div className="problem-content">
                    <h3>{problem.title}</h3>
                    <p className="problem-description">{problem.description}</p>
                    <div className="problem-meta">
                      <span className="issue-tag">📍 {problem.district}</span>
                      <span className="issue-tag">🏷️ {problem.category}</span>
                    </div>
                    {problem.status !== 'resolved' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setShowCompletionModal(problem.id)}>
                        📸 Upload Solution Photo
                      </button>
                    )}
                    {problem.status === 'resolved' && problem.completionPhoto && (
                      <div className="completion-proof">
                        <img src={problem.completionPhoto} alt="Solution" className="completion-thumb" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {problems.filter(p => p.mlaId == currentMLA.id).length === 0 && (
                <div className="empty-state">
                  <h3>No problems assigned to you yet</h3>
                  <p>Problems reported in your constituency will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {mlaSelectModal && (
        <div className="modal-overlay" onClick={() => setMlaSelectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🔐 MLA Login</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Select your name to access MLA Portal</p>
            <div className="form-group">
              <label>Select MLA</label>
              <select onChange={(e) => {
                if (e.target.value) {
                  const mla = sampleMLAs.find(m => m.id == e.target.value)
                  setCurrentMLA(mla)
                  setMlaSelectModal(false)
                  setActiveTab('mla-portal')
                  showToast(`Logged in as ${mla.name}`)
                }
              }}>
                <option value="">-- Select Your Name --</option>
                {sampleMLAs.map(mla => <option key={mla.id} value={mla.id}>{mla.name} - {mla.constituency}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setMlaSelectModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showProblemModal && (
        <div className="modal-overlay" onClick={() => setShowProblemModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📍 Report Problem</h2>
            <div className="form-group">
              <label>Problem Title *</label>
              <input
                type="text"
                placeholder="e.g., Broken road in Nagaon"
                value={problemForm.title}
                onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Describe the problem..."
                value={problemForm.description}
                onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>District *</label>
              <select value={problemForm.district} onChange={(e) => setProblemForm({ ...problemForm, district: e.target.value })}>
                <option value="">Select District</option>
                {assamDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={problemForm.category} onChange={(e) => setProblemForm({ ...problemForm, category: e.target.value })}>
                <option value="">Select Category</option>
                {issueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tag MLA (Optional)</label>
              <select value={problemForm.mlaId} onChange={(e) => setProblemForm({ ...problemForm, mlaId: e.target.value })}>
                <option value="">Select MLA</option>
                {sampleMLAs.map(mla => <option key={mla.id} value={mla.id}>{mla.name} - {mla.constituency}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Photo Evidence *</label>
              <div className={`photo-upload ${problemForm.photo ? 'has-image' : ''}`}>
                {problemForm.photo ? (
                  <>
                    <img src={problemForm.photo} alt="Preview" className="photo-preview" />
                    <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setProblemForm({ ...problemForm, photo: '' })}>Remove</button>
                  </>
                ) : (
                  <label className="photo-upload-text">
                    <span>Click to upload</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, (v) => setProblemForm(p => ({ ...p, photo: v })))} />
                  </label>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowProblemModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleProblemSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {showRatingModal && (
        <div className="modal-overlay" onClick={() => setShowRatingModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⭐ Rate Problem Solution</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Rate: {selectedMLA?.name}</p>
            <div className="form-group">
              <label>Rating</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`star ${star <= ratingForm.rating ? '' : 'empty'}`}
                    onClick={() => setRatingForm({ ...ratingForm, rating: star })}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Feedback (optional)</label>
              <textarea
                placeholder="Share your experience..."
                value={ratingForm.comment}
                onChange={(e) => setRatingForm({ ...ratingForm, comment: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowRatingModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleProblemRatingSubmit(selectedMLA.id)}>Submit</button>
            </div>
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="modal-overlay" onClick={() => setShowCompletionModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📸 Mark as Solved</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Upload photo after work is completed</p>
            <div className="form-group">
              <label>Completion Photo *</label>
              <div className={`photo-upload ${completionForm.photo ? 'has-image' : ''}`}>
                {completionForm.photo ? (
                  <>
                    <img src={completionForm.photo} alt="Preview" className="photo-preview" />
                    <button className="btn btn-secondary" style={{ marginTop: '0.5rem' }} onClick={() => setCompletionForm({ ...completionForm, photo: '' })}>Remove</button>
                  </>
                ) : (
                  <label className="photo-upload-text">
                    <span>Click to upload</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handlePhotoUpload(e, (v) => setCompletionForm(p => ({ ...p, photo: v })))} />
                  </label>
                )}
              </div>
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                placeholder="Describe the completed work..."
                value={completionForm.description}
                onChange={(e) => setCompletionForm({ ...completionForm, description: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCompletionModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => handleMLACompletionSubmit(showCompletionModal)}>Mark Solved</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <footer className="footer">
        <div className="app-container">
          <p>🇮🇳 Assam Voter Platform — All {sampleMLAs.length} MLAs | One Voice, One Assam</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>One IP = One Rating per Problem</p>
        </div>
      </footer>
    </>
  )
}

export default App