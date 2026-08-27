import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

const GroqIcon = () => (
    <svg width="14" height="14" viewBox="0 0 560 400" fill="currentColor" style={{ flexShrink: 0 }}>
        <g><path d="M47.7883.05664c-5.5135 0-9.9914 4.47795-9.9914 9.99146 0 5.5134 4.4779 9.9914 9.9914 9.9914 5.5135 0 9.9914-4.478 9.9914-9.9914 0-5.51351-4.4779-9.977466-9.9914-9.99146Zm0 16.23256c-3.4424 0-6.2411-2.7987-6.2411-6.2411 0-3.44246 2.7987-6.24118 6.2411-6.24118s6.2411 2.79872 6.2411 6.24118c0 3.4424-2.7987 6.2411-6.2411 6.2411ZM10.0759.000524C4.56244-.05545.056498 4.38052.000524 9.894-.05545 15.4075 4.38052 19.9274 9.894 19.9694h3.4704v-3.7363h-3.2885c-3.44241.042-6.26912-2.7148-6.3111-6.1712-.04198-3.44241 2.71476-6.26911 6.17118-6.31109h.13992c3.4424 0 6.2552 2.79872 6.2552 6.24114v9.19375c0 3.4145-2.7848 6.1992-6.1992 6.2412-1.63726 0-3.19055-.6717-4.33803-1.8332l-2.64479 2.6448c1.83316 1.8472 4.32402 2.8967 6.92682 2.9247h.1399c5.4436-.084 9.8236-4.492 9.8515-9.9355V9.74007C19.9274 4.32454 15.5054.000524 10.0899.000524h-.014ZM79.9987 28.744V9.79671c-.14-5.41552-4.562-9.739545-9.9775-9.739545C64.5077.00119 59.9878 4.43716 59.9458 9.95064c-.0559 5.51346 4.38 10.03336 9.8935 10.07536h3.4704v-3.7363h-3.2885c-3.4424.042-6.2691-2.7147-6.3111-6.1711-.042-3.44247 2.7148-6.26917 6.1712-6.31115h.1399c3.4425 0 6.2552 2.79872 6.2552 6.24115V28.716l3.7223.042v-.014ZM22.9202 20.0255h3.7223v-9.9914c0-3.44245 2.7988-6.24117 6.2412-6.24117 1.1335 0 2.197.30786 3.1206.83962l1.8751-3.24652C36.4101.532423 34.7029.05664 32.8977.05664c-5.5135 0-9.9915 4.47795-9.9915 9.99146v9.9914l.014-.014Z" transform="translate(100.0, 134.3817337793672) scale(4.500073129185994) translate(-5.3290591032649146e-08, -5.3290591032649146e-08)" /></g>
    </svg>
);

const OpenAIIcon = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 1.942-.693l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455v4.49Z" />
    </svg>
);

const ClaudeIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.541Z" />
    </svg>
);

const GeminiIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
        <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.93 4.68a12.3 12.3 0 0 1-2.58 3.81 12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.93.96.39 1.77.93.81.54 1.5 1.23.69.69 1.23 1.5t.93 1.77Z" />
    </svg>
);

const PROVIDER_CONFIGS = {
    groq: { name: 'Groq', icon: <GroqIcon /> },
    openai: { name: 'OpenAI', icon: <OpenAIIcon /> },
    claude: { name: 'Claude', icon: <ClaudeIcon /> },
    gemini: { name: 'Gemini', icon: <GeminiIcon /> }
};

const ProviderBadge = ({ feature }) => {
    const { settings, loading, saveAiRouting } = useSettings();
    const [open, setOpen] = useState(false);
    
    if (loading || !settings) return null;

    const provider = settings?.ai_routing?.[feature]?.provider || 'groq';
    const isSet = settings?.[`${provider}_token_set`];

    const availableProviders = Object.keys(PROVIDER_CONFIGS).filter(p => settings[`${p}_token_set`]);

    const handleSelect = async (newProvider) => {
        setOpen(false);
        if (newProvider === provider) return;
        const newRouting = { ...settings.ai_routing, [feature]: { provider: newProvider, model: '' } };
        try {
            await saveAiRouting(newRouting);
        } catch (err) {
            console.error('Failed to update routing', err);
        }
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <div 
                style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '4px 8px', 
                    borderRadius: '12px', backgroundColor: isSet ? '#eefdf8' : '#fff0f0', 
                    border: `1px solid ${isSet ? '#0f6e56' : '#a32d2d'}`, color: isSet ? '#0f6e56' : '#a32d2d', 
                    whiteSpace: 'nowrap', cursor: availableProviders.length > 0 ? 'pointer' : 'default',
                    userSelect: 'none'
                }}
                onClick={() => availableProviders.length > 0 && setOpen(!open)}
            >
                {PROVIDER_CONFIGS[provider]?.icon}
                <span style={{ fontWeight: 600 }}>{PROVIDER_CONFIGS[provider]?.name || provider}</span>
                {isSet ? (
                    availableProviders.length > 1 ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 2, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    ) : null
                ) : 'Missing Key'}
            </div>

            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
                    <div style={{ 
                        position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', 
                        border: '1px solid #e2e8f0', borderRadius: '8px', zIndex: 10, 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '120px', overflow: 'hidden'
                    }}>
                        {availableProviders.map(p => (
                            <div 
                                key={p}
                                style={{ 
                                    padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', 
                                    cursor: 'pointer', fontSize: '12px', color: '#1e293b',
                                    backgroundColor: p === provider ? '#f8fafc' : '#fff',
                                    borderBottom: '1px solid #f1f5f9'
                                }}
                                onClick={() => handleSelect(p)}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = p === provider ? '#f8fafc' : '#fff'}
                            >
                                {PROVIDER_CONFIGS[p].icon}
                                <span style={{ fontWeight: p === provider ? 600 : 400 }}>{PROVIDER_CONFIGS[p].name}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default ProviderBadge;
