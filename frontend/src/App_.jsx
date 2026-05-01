import { useState, useEffect } from 'react'
import { uploadCSV, checkHealth } from './api'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('profile')
  const [backendStatus, setBackendStatus] = useState('checking')
  
  // Profile state
  const [profile, setProfile] = useState({
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '+972 50 123 4567',
    linkedin: 'linkedin.com/in/alexjohnson',
    website: '',
    roles: 'Software Engineer, Backend Engineer',
    locations: 'Tel Aviv, Remote',
    bio: 'Experienced software engineer with 5+ years building scalable backend systems. Passionate about distributed systems, cloud infrastructure, and developer experience. Currently open to senior and staff-level opportunities.',
    cv: 'Alex_Johnson_CV_2025.pdf'
  })

  // Applications state
  const [applications, setApplications] = useState([])
  const [appUploadStatus, setAppUploadStatus] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [showAppModal, setShowAppModal] = useState(false)

  // Network state
  const [contacts, setContacts] = useState([
    { id: 1, name: 'Tom Kessler', company: 'Google', phone: '+972 54 000 1234', relation: 'Colleague' },
    { id: 2, name: 'Sara Levi', company: 'Meta', phone: '+972 52 555 9090', relation: 'Friend' },
    { id: 3, name: 'Maya Rosenberg', company: 'Wix', phone: '+972 50 321 8877', relation: 'Recruiter' }
  ])
  const [netUploadStatus, setNetUploadStatus] = useState('')
  const [showContactModal, setShowContactModal] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', company: '', phone: '', relation: 'Colleague' })

  // Search state
  const [searchKeywords, setSearchKeywords] = useState(['Backend Engineer', 'Node.js', 'Python'])
  const [antiKeywords, setAntiKeywords] = useState(['3+ years experience', 'Senior Manager'])

  // Tailor state
  const [tailorJobDesc, setTailorJobDesc] = useState('')
  const [tailorOutput, setTailorOutput] = useState('Tailored CV suggestions will appear here once n8n processes the job description and your CV…')

  useEffect(() => {
    const savedApps = localStorage.getItem('jobpilot_applications')
    const savedContacts = localStorage.getItem('jobpilot_contacts')
    if (savedApps) setApplications(JSON.parse(savedApps))
    if (savedContacts) setContacts(JSON.parse(savedContacts))

    checkHealth()
      .then(() => setBackendStatus('connected'))
      .catch(() => setBackendStatus('disconnected'))
  }, [])

  useEffect(() => {
    localStorage.setItem('jobpilot_applications', JSON.stringify(applications))
  }, [applications])

  useEffect(() => {
    localStorage.setItem('jobpilot_contacts', JSON.stringify(contacts))
  }, [contacts])

  const handleCSVUpload = async (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return

    const setStatus = type === 'applications' ? setAppUploadStatus : setNetUploadStatus

    try {
      setStatus('Uploading...')
      const result = await uploadCSV(file, type)
      
      if (type === 'applications') {
        const normalized = result.data.map((row, index) => ({
          ...row,
          id: row.id ?? index,
          COMPANY: row.COMPANY || row.company || row['Company'] || row['company name'] || row['Company Name'] || '',
          ROLE_ID: row.ROLE_ID || row.role_id || row['Role ID'] || row['role id'] || row['Role'] || '',
          DATE: row.DATE || row.date || row['Date'] || '',
          STATUS: row.STATUS || row.status || row['Status'] || '',
          LOCATION: row.LOCATION || row.location || row['Location'] || '',
          INFO: row.INFO || row.info || row['Info'] || row['Notes'] || '',
          REFERAL: row.REFERAL || row.referal || row['Referral'] || row['Referal'] || '',
          LINK: row.LINK || row.link || row['Link'] || row['URL'] || row['Url'] || ''
        }))
        setApplications(normalized)
        setAppUploadStatus(`✓ Loaded ${result.rowCount} rows`)
      } else {
        const normalizedContacts = result.data.map((row, index) => ({
          id: row.id ?? index,
          name: row.Contact || row.contact || row['Name'] || row['name'] || '',
          company: row['Company Name'] || row['company name'] || row.Company || row.company || '',
          phone: row['Phone Number'] || row['phone number'] || row.Phone || row.phone || '',
          relation: row.relation || row.Relation || 'Contact'
        }))
        setContacts(normalizedContacts)
        setNetUploadStatus(`✓ Loaded ${result.rowCount} contacts`)
      }
    } catch (error) {
      setStatus(`✗ Error: ${error.message}`)
    }
  }

  const handleProfileChange = (field, value) => {
    setProfile({ ...profile, [field]: value })
  }

  const getInitials = (name) => {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const appStats = {
    total: applications.length,
    active: applications.filter(a => !a.STATUS?.toLowerCase().includes('reject') && !a.STATUS?.toLowerCase().includes('offer')).length,
    interview: applications.filter(a => a.STATUS?.toLowerCase().includes('interview') || a.STATUS?.toLowerCase().includes('phone') || a.STATUS?.toLowerCase().includes('technical')).length,
    offer: applications.filter(a => a.STATUS?.toLowerCase().includes('offer')).length
  }

  const statusBadgeClass = (status) => {
    const v = (status || '').toLowerCase()
    if (v.includes('offer')) return 'badge-offer'
    if (v.includes('reject')) return 'badge-rejected'
    if (v.includes('tech')) return 'badge-tech'
    if (v.includes('phone')) return 'badge-phone'
    if (v.includes('applied')) return 'badge-applied'
    return 'badge-pending'
  }

  const handleAddContact = () => {
    if (!newContact.name.trim()) return
    const contact = {
      id: Date.now(),
      ...newContact
    }
    setContacts([...contacts, contact])
    setNewContact({ name: '', company: '', phone: '', relation: 'Colleague' })
    setShowContactModal(false)
  }

  const handleUpdateAppStatus = (index, newStatus) => {
    const updated = [...applications]
    updated[index] = { ...updated[index], STATUS: newStatus }
    setApplications(updated)
    setSelectedApp(updated[index])
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          <div className="logo-mark">JobPilot</div>
          <div className="logo-sub">Career command center</div>
        </div>
        <nav className="nav">
          {['profile', 'applications', 'network', 'search', 'tailor'].map(tab => (
            <div
              key={tab}
              className={`nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <span>
                {tab === 'profile' && 'Profile'}
                {tab === 'applications' && 'Applications'}
                {tab === 'network' && 'Network Edge'}
                {tab === 'search' && 'Auto Search'}
                {tab === 'tailor' && 'CV Tailoring'}
              </span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          JobPilot v2.0
          <div style={{ fontSize: '10px', marginTop: '4px', color: backendStatus === 'connected' ? '#0f6e56' : '#a32d2d' }}>
            Backend: {backendStatus}
          </div>
        </div>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">
            {activeTab === 'profile' && 'My Profile'}
            {activeTab === 'applications' && 'Application Tracker'}
            {activeTab === 'network' && 'Network Edge'}
            {activeTab === 'search' && 'Automated Job Search'}
            {activeTab === 'tailor' && 'CV Tailoring'}
          </div>
        </div>

        <div className="content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="section profile-grid">
              <div className="card">
                <div className="card-title">Personal Info</div>
                <div className="field-group">
                  <div className="field-label">Full Name</div>
                  <input className="field-input" value={profile.name} onChange={(e) => handleProfileChange('name', e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">Email Address</div>
                  <input className="field-input" type="email" value={profile.email} onChange={(e) => handleProfileChange('email', e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">Phone</div>
                  <input className="field-input" value={profile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">LinkedIn URL</div>
                  <input className="field-input" value={profile.linkedin} onChange={(e) => handleProfileChange('linkedin', e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">Portfolio / Website</div>
                  <input className="field-input" value={profile.website} onChange={(e) => handleProfileChange('website', e.target.value)} />
                </div>
              </div>

              <div className="card">
                <div className="card-title">CV & Preferences</div>
                <div className="field-group">
                  <div className="field-label">Active CV</div>
                  <div className="cv-badge">{profile.cv}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Target Roles</div>
                  <input className="field-input" value={profile.roles} onChange={(e) => handleProfileChange('roles', e.target.value)} />
                </div>
                <div className="field-group">
                  <div className="field-label">Target Locations</div>
                  <input className="field-input" value={profile.locations} onChange={(e) => handleProfileChange('locations', e.target.value)} />
                </div>
              </div>

              <div className="card profile-span">
                <div className="card-title">Summary</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>

              <div className="card profile-span">
                <div className="card-title">Technical Skills</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>
              
              <div className="card profile-span">
                <div className="card-title">Education</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>

              <div className="card profile-span">
                <div className="card-title">Projects</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>

              <div className="card profile-span">
                <div className="card-title">Experience</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>

              <div className="card profile-span">
                <div className="card-title">Additional Information</div>
                <textarea className="textarea" value={profile.bio} onChange={(e) => handleProfileChange('bio', e.target.value)} style={{ minHeight: '80px' }} />
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="section">
              <div className="stats-bar">
                <div className="stat-card">
                  <div className="stat-num">{appStats.total}</div>
                  <div className="stat-lbl">Total Applied</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--accent)' }}>{appStats.active}</div>
                  <div className="stat-lbl">Active / In Progress</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: 'var(--success-c)' }}>{appStats.interview}</div>
                  <div className="stat-lbl">In Interviews</div>
                </div>
                <div className="stat-card">
                  <div className="stat-num" style={{ color: '#155724' }}>{appStats.offer}</div>
                  <div className="stat-lbl">Offers</div>
                </div>
              </div>

              <div className="import-bar">
                <button className="btn btn-primary btn-sm">
                  <label htmlFor="app-csv" style={{ cursor: 'pointer', margin: 0 }}>
                    Import CSV
                    <input
                      id="app-csv"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleCSVUpload(e, 'applications')}
                      style={{ display: 'none' }}
                    />
                  </label>
                </button>
                <span className="import-hint">Columns: COMPANY · ROLE_ID · INFO · CV_FILE · DATE · STATUS · LINK · LOCATION · REFERAL · Phone Interview · Technical Interview2</span>
              </div>

              {appUploadStatus && (
                <div style={{ padding: '10px 22px', color: appUploadStatus.includes('Error') ? '#a32d2d' : '#0f6e56', fontSize: '12px' }}>
                  {appUploadStatus}
                </div>
              )}

              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Role ID</th>
                      <th>Info</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Referral</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan="8">Import a CSV to start tracking</td>
                      </tr>
                    ) : (
                      applications.map((app, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '600' }}>{app.COMPANY || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{app.ROLE_ID || '—'}</td>
                          <td style={{ maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '11px' }}>{app.INFO || '—'}</td>
                          <td style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{app.DATE || '—'}</td>
                          <td><span className={`badge ${statusBadgeClass(app.STATUS)}`}>{app.STATUS || '—'}</span></td>
                          <td style={{ fontSize: '11px' }}>{app.LOCATION || '—'}</td>
                          <td style={{ fontSize: '11px' }}>{app.REFERAL || '—'}</td>
                          <td>{app.LINK ? <a href={app.LINK} target="_blank" rel="noreferrer">Open ↗</a> : '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Network Tab */}
          {activeTab === 'network' && (
            <div className="section">
              <div className="import-bar">
                <button className="btn btn-primary btn-sm">
                  <label htmlFor="net-csv" style={{ cursor: 'pointer', margin: 0 }}>
                    Import CSV
                    <input
                      id="net-csv"
                      type="file"
                      accept=".csv"
                      onChange={(e) => handleCSVUpload(e, 'network')}
                      style={{ display: 'none' }}
                    />
                  </label>
                </button>
                <span className="import-hint">Columns: Company Name · Contact · Phone Number · relation</span>
                <button className="btn btn-primary btn-sm" onClick={() => setShowContactModal(true)} style={{ marginLeft: 'auto' }}>
                  + Add Contact
                </button>
              </div>

              {netUploadStatus && (
                <div style={{ padding: '10px 22px', color: netUploadStatus.includes('Error') ? '#a32d2d' : '#0f6e56', fontSize: '12px' }}>
                  {netUploadStatus}
                </div>
              )}

              <div className="network-grid">
                {contacts.map(contact => (
                  <div key={contact.id} className="contact-card">
                    <div className="contact-avatar">{getInitials(contact.name)}</div>
                    <div className="contact-name">{contact.name}</div>
                    <div className="contact-co">{contact.company}</div>
                    <div className="contact-phone">{contact.phone}</div>
                    <div className="contact-rel">{contact.relation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="section" style={{ padding: '20px' }}>
              <h2>Auto Search Configuration</h2>
              <div className="form-section" style={{ marginTop: '20px' }}>
                <label className="form-label">Search Keywords</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg2)' }}>
                  {searchKeywords.map((kw, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="form-section">
                <label className="form-label">Anti Keywords (Exclude)</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg2)' }}>
                  {antiKeywords.map((kw, i) => (
                    <span key={i} style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger-c)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--bg2)', borderRadius: '8px' }}>
                <p style={{ color: 'var(--t2)', fontSize: '12px' }}>Feature coming soon - Configure job boards and automated search scheduling</p>
              </div>
            </div>
          )}

          {/* CV Tailoring Tab */}
          {activeTab === 'tailor' && (
            <div className="section tailor-grid">
              <div className="card">
                <div className="card-title">Job Source</div>
                <div className="field-group">
                  <div className="field-label">Job Requirements / Description</div>
                  <textarea
                    className="textarea"
                    value={tailorJobDesc}
                    onChange={(e) => setTailorJobDesc(e.target.value)}
                    style={{ minHeight: '150px' }}
                    placeholder="Paste the full job description or key requirements here…"
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-title">Your CV</div>
                <div className="field-group">
                  <div className="field-label">Using Active CV</div>
                  <div className="cv-badge">{profile.cv}</div>
                </div>
                <div className="field-group">
                  <div className="field-label">Tailoring Focus</div>
                  <select className="field-input">
                    <option>Highlight matching skills</option>
                    <option>Reorder experience by relevance</option>
                    <option>Adjust summary / objective</option>
                    <option>Full rewrite for role</option>
                  </select>
                </div>
              </div>

              <div className="card tailor-span">
                <div className="card-title">Output</div>
                <div style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '13px', minHeight: '120px', fontSize: '12px', color: 'var(--t3)', fontStyle: 'italic', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {tailorOutput}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAppModal && selectedApp && (
        <div className="modal-overlay" onClick={() => setShowAppModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedApp.COMPANY} — {selectedApp.ROLE_ID}</h2>
              <button className="modal-close" onClick={() => setShowAppModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <label>Company</label>
                <p>{selectedApp.COMPANY}</p>
              </div>
              <div className="modal-section">
                <label>Role / ID</label>
                <p>{selectedApp.ROLE_ID}</p>
              </div>
              <div className="modal-section">
                <label>Info / Notes</label>
                <p>{selectedApp.INFO || '—'}</p>
              </div>
              <div className="modal-section">
                <label>Date Applied</label>
                <p>{selectedApp.DATE || '—'}</p>
              </div>
              <div className="modal-section">
                <label>Location</label>
                <p>{selectedApp.LOCATION || '—'}</p>
              </div>
              <div className="modal-section">
                <label>Referral</label>
                <p>{selectedApp.REFERAL || '—'}</p>
              </div>
              <div className="modal-section">
                <label>Status</label>
                <select className="field-input" value={selectedApp.STATUS || ''} onChange={(e) => handleUpdateAppStatus(selectedApp.index, e.target.value)}>
                  <option value="">Select Status</option>
                  <option value="Applied">Applied</option>
                  <option value="Phone Interview">Phone Interview</option>
                  <option value="Technical Interview">Technical Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              {selectedApp.LINK && (
                <div className="modal-section">
                  <label>Job Link</label>
                  <a href={selectedApp.LINK} target="_blank" rel="noreferrer">{selectedApp.LINK}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Contact</h2>
              <button className="modal-close" onClick={() => setShowContactModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-section">
                <label>Name</label>
                <input className="field-input" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="modal-section">
                <label>Company</label>
                <input className="field-input" value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} placeholder="Company" />
              </div>
              <div className="modal-section">
                <label>Phone</label>
                <input className="field-input" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} placeholder="+1 555 0000" />
              </div>
              <div className="modal-section">
                <label>Relation</label>
                <select className="field-input" value={newContact.relation} onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}>
                  <option>Colleague</option>
                  <option>Friend</option>
                  <option>Recruiter</option>
                  <option>Manager</option>
                  <option>Mentor</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowContactModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddContact}>Add Contact</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
