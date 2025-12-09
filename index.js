// State Management with sessionStorage persistence
const state = {
  connected: false,
  walletAddress: null,
  currentView: 'dashboard',
  wallet: null,
  proposals: [],
  proposalFilter: 'all',
  isMounted: true,
  intervals: [],
  timeouts: []
};

// Load state from sessionStorage on init
function loadStateFromStorage() {
  try {
    const saved = sessionStorage.getItem('stellar_multisig_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      state.connected = parsed.connected || false;
      state.walletAddress = parsed.walletAddress || null;
      state.wallet = parsed.wallet || null;
      state.proposals = parsed.proposals || [];
      state.proposalFilter = parsed.proposalFilter || 'all';
      return true;
    }
  } catch (error) {
    console.error('Failed to load state from sessionStorage:', error);
  }
  return false;
}

// Save state to sessionStorage
function saveStateToStorage() {
  try {
    const toSave = {
      connected: state.connected,
      walletAddress: state.walletAddress,
      wallet: state.wallet,
      proposals: state.proposals,
      proposalFilter: state.proposalFilter
    };
    sessionStorage.setItem('stellar_multisig_state', JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save state to sessionStorage:', error);
  }
}

// Clear state from sessionStorage
function clearStateFromStorage() {
  try {
    sessionStorage.removeItem('stellar_multisig_state');
  } catch (error) {
    console.error('Failed to clear state from sessionStorage:', error);
  }
}

// Validation patterns (Stellar uses base32 encoding: A-Z and 2-7)
const VALIDATION = {
  stellarAddress: /^G[A-Z0-9]{55}$/,
  contractAddress: /^C[A-Z0-9]{55}$/,
  maxSigners: 10,
  minSigners: 1,
  maxDecimals: 18
};

// Error messages
const ERRORS = {
  freighterNotFound: 'Freighter wallet not detected. Please install it from freighter.app',
  invalidAddress: 'Invalid Stellar address format. Must be 56 characters starting with G (uppercase letters and numbers only)',
  invalidThreshold: 'Threshold must be between 1 and number of signers',
  duplicateSigner: 'This address is already added as a signer',
  insufficientSigners: 'Need at least 1 signer',
  userDeclined: 'Transaction declined. Please try again when ready.',
  connectionFailed: 'Failed to connect to Freighter. Please try again.',
  invalidAmount: 'Amount must be a positive number with max 18 decimals'
};

// Network configuration
const NETWORK_CONFIG = {
  network: 'TESTNET',
  networkPassphrase: 'Test SDF Network ; September 2015',
  horizonUrl: 'https://horizon-testnet.stellar.org'
};

// Sample data for demo
const SAMPLE_DATA = {
  wallet: {
    contractAddress: 'CBWNXQRGC7WFYGDXUANDAZSRF2E5NPPA3NP6UZSPHYBVU3K46PSNWQOO',
    signers: [
      'GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
      'GBVLTYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZMLWXQWMJZQHG',
      'GCXK4RTFH6QBWQZKYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZ'
    ],
    threshold: 2
  },
  proposals: [
    {
      id: 1,
      to: 'GDQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
      token: 'NATIVE',
      amount: '100.50',
      approvers: ['GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG'],
      executed: false,
      createdBy: 'GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
      createdAt: new Date('2025-11-10T10:00:00').getTime(),
      description: 'Payment for services'
    },
    {
      id: 2,
      to: 'GBXK4RTFH6QBWQZKYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZ',
      token: 'NATIVE',
      amount: '50.00',
      approvers: [
        'GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
        'GBVLTYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZMLWXQWMJZQHG'
      ],
      executed: true,
      createdBy: 'GBVLTYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZMLWXQWMJZQHG',
      createdAt: new Date('2025-11-08T14:30:00').getTime(),
      executedAt: new Date('2025-11-09T09:15:00').getTime(),
      transactionHash: '5a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      description: 'Team bonus payment'
    },
    {
      id: 3,
      to: 'GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
      token: 'NATIVE',
      amount: '200.00',
      approvers: [],
      executed: false,
      createdBy: 'GCXK4RTFH6QBWQZKYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZ',
      createdAt: new Date('2025-11-12T16:45:00').getTime(),
      description: 'Vendor payment'
    },
    {
      id: 4,
      to: 'GBVLTYQW4WGOJFKWXHK7CXM7G4WGMLMCQKZJ4ZNYQVQZMLWXQWMJZQHG',
      token: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
      amount: '1000.00',
      approvers: ['GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG'],
      executed: false,
      createdBy: 'GAQRGJ4D2ZPLVFJQM3KRD5ORAIHPNZ4VNMQMZPGX7GJWMQM3RVMJZQHG',
      createdAt: new Date('2025-11-11T11:20:00').getTime(),
      description: 'USDC payment for contract work'
    }
  ]
};

// Utility Functions
function truncateAddress(address, startChars = 6, endChars = 4) {
  if (!address) return '';
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

function generateStellarAddress() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = 'G';
  for (let i = 0; i < 55; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

function isValidStellarAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return VALIDATION.stellarAddress.test(address.trim());
}

function isValidContractAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return VALIDATION.contractAddress.test(address.trim());
}

function isValidAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return false;
  const decimals = (amount.toString().split('.')[1] || '').length;
  return decimals <= VALIDATION.maxDecimals;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
}

// Toast with proper cleanup
let currentToastTimeout = null;

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  
  // Clear existing timeout
  if (currentToastTimeout) {
    clearTimeout(currentToastTimeout);
  }
  
  // Sanitize message to prevent XSS
  toast.textContent = message;
  toast.className = `toast toast--show toast--${type}`;
  
  currentToastTimeout = setTimeout(() => {
    if (state.isMounted) {
      toast.classList.remove('toast--show');
    }
    currentToastTimeout = null;
  }, 3000);
  
  state.timeouts.push(currentToastTimeout);
}

function copyToClipboard(text) {
  // Use modern clipboard API if available
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!', 'success');
      })
      .catch(() => {
        fallbackCopy(text);
      });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.setAttribute('readonly', '');
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Copied to clipboard!', 'success');
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
  document.body.removeChild(textArea);
}

// Wallet Connection with Freighter API
async function connectWallet() {
  // Disable connect button during process
  const connectBtns = document.querySelectorAll('#connectBtn, #welcomeConnectBtn');
  connectBtns.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    btn.classList.add('btn--loading');
  });
  
  try {
    // Check if Freighter is installed
    if (!window.freighterApi) {
      showToast(ERRORS.freighterNotFound, 'error');
      setTimeout(() => {
        if (confirm('Freighter wallet extension is required. Would you like to install it?')) {
          window.open('https://freighter.app', '_blank');
        }
      }, 100);
      return;
    }

    // Check connection status
    let isConnected = false;
    try {
      isConnected = await Promise.race([
        window.freighterApi.isConnected(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
    } catch (error) {
      showToast('Freighter connection timeout. Please try again.', 'error');
      return;
    }
    
    if (!isConnected) {
      showToast('Freighter is locked. Please unlock your wallet and try again.', 'warning');
      return;
    }

    // Get public key using correct API method
    let publicKey;
    try {
      publicKey = await Promise.race([
        window.freighterApi.getPublicKey(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
    } catch (error) {
      if (error.message && error.message.includes('User declined')) {
        showToast('Connection cancelled. Click "Connect Wallet" when you\'re ready.', 'info');
        return;
      }
      showToast('Failed to get wallet address. Please try again.', 'error');
      return;
    }
    
    if (!publicKey) {
      showToast(ERRORS.connectionFailed, 'error');
      return;
    }

    // Validate the address format
    if (!isValidStellarAddress(publicKey)) {
      showToast('Invalid address format received from Freighter', 'error');
      return;
    }

    state.connected = true;
    state.walletAddress = publicKey;
    
    // Load sample data for demo
    state.wallet = JSON.parse(JSON.stringify(SAMPLE_DATA.wallet));
    state.proposals = JSON.parse(JSON.stringify(SAMPLE_DATA.proposals));
    
    updateWalletUI();
    showView('dashboard');
    showToast('Wallet connected successfully!', 'success');
    
  } catch (error) {
    console.error('Connection error:', error);
    if (error.message && error.message.includes('User declined')) {
      showToast('Connection cancelled by user', 'info');
    } else if (error.message && error.message.includes('Timeout')) {
      showToast('Connection timeout. Please check Freighter and try again.', 'error');
    } else {
      showToast('Failed to connect wallet. Please try again.', 'error');
    }
  } finally {
    // Re-enable connect button
    connectBtns.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Connect Wallet';
      btn.classList.remove('btn--loading');
    });
  }
}

function disconnectWallet() {
  // Clear all intervals and timeouts
  state.intervals.forEach(id => clearInterval(id));
  state.timeouts.forEach(id => clearTimeout(id));
  state.intervals = [];
  state.timeouts = [];
  
  state.connected = false;
  state.walletAddress = null;
  state.wallet = null;
  state.proposals = [];
  state.proposalFilter = 'all';
  
  // Clear sessionStorage
  clearStateFromStorage();
  
  updateWalletUI();
  showView('welcome');
  showToast('Wallet disconnected', 'info');
}

function updateWalletUI() {
  const walletStatus = document.getElementById('walletStatus');
  
  if (state.connected) {
    // Show full address on hover with title attribute for accessibility
    walletStatus.innerHTML = `
      <div class="wallet-address" title="${escapeHtml(state.walletAddress)}">
        <span>${truncateAddress(state.walletAddress)}</span>
        <button class="copy-btn" onclick="copyToClipboard('${escapeHtml(state.walletAddress)}')" aria-label="Copy wallet address">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
      <button class="btn btn--secondary" onclick="disconnectWallet()" aria-label="Disconnect wallet">Disconnect</button>
    `;
  } else {
    walletStatus.innerHTML = `
      <button class="btn btn--primary" id="connectBtn" onclick="connectWallet()" aria-label="Connect Freighter wallet">Connect Wallet</button>
    `;
  }
}

// View Management
function showView(viewName) {
  // Hide all main views
  document.getElementById('welcomeView').classList.add('view--hidden');
  document.getElementById('dashboardView').classList.add('view--hidden');
  
  // Show selected view
  if (viewName === 'welcome') {
    document.getElementById('welcomeView').classList.remove('view--hidden');
  } else {
    document.getElementById('dashboardView').classList.remove('view--hidden');
    showContentView(viewName);
  }
}

function showContentView(viewName) {
  state.currentView = viewName;
  
  // Hide all content views
  const contentViews = document.querySelectorAll('.content-view');
  contentViews.forEach(view => view.classList.add('content-view--hidden'));
  
  // Update navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('nav-item--active');
    if (item.dataset.view === viewName) {
      item.classList.add('nav-item--active');
    }
  });
  
  // Show selected content view
  const viewMap = {
    'dashboard': 'dashboardContent',
    'initialize': 'initializeContent',
    'create-proposal': 'createProposalContent',
    'proposals': 'proposalsContent',
    'wallet-info': 'walletInfoContent'
  };
  
  const contentId = viewMap[viewName];
  if (contentId) {
    document.getElementById(contentId).classList.remove('content-view--hidden');
    
    // Render content based on view
    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'proposals') renderProposals();
    if (viewName === 'wallet-info') renderWalletInfo();
  }
}

// Dashboard Rendering
function renderDashboard() {
  const grid = document.getElementById('dashboardGrid');
  
  if (!state.wallet) {
    grid.innerHTML = `
      <div class="stat-card" style="grid-column: 1 / -1;">
        <div class="empty-state">
          <div class="empty-state-icon">🔐</div>
          <h3 class="empty-state-title">Wallet Not Initialized</h3>
          <p class="empty-state-desc">Initialize your multisig wallet to get started</p>
          <button class="btn btn--primary" style="margin-top: 16px;" onclick="showContentView('initialize')">Initialize Wallet</button>
        </div>
      </div>
    `;
    return;
  }
  
  const pendingProposals = state.proposals.filter(p => !p.executed && p.approvers.length < state.wallet.threshold);
  const readyProposals = state.proposals.filter(p => !p.executed && p.approvers.length >= state.wallet.threshold);
  
  grid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Contract Address</div>
      <div class="stat-value stat-value--small">${truncateAddress(state.wallet.contractAddress, 8, 6)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Signers</div>
      <div class="stat-value">${state.wallet.signers.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Threshold</div>
      <div class="stat-value">${state.wallet.threshold} of ${state.wallet.signers.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Proposals</div>
      <div class="stat-value">${state.proposals.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Approvals</div>
      <div class="stat-value">${pendingProposals.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Ready to Execute</div>
      <div class="stat-value">${readyProposals.length}</div>
    </div>
  `;
}

// Initialize Wallet Form
let signerCount = 1;

function setupInitializeForm() {
  const form = document.getElementById('initializeForm');
  const addSignerBtn = document.getElementById('addSignerBtn');
  const thresholdInput = document.getElementById('thresholdInput');
  const thresholdSlider = document.getElementById('thresholdSlider');
  
  addSignerBtn.addEventListener('click', addSignerInput);
  
  thresholdInput.addEventListener('input', (e) => {
    thresholdSlider.value = e.target.value;
    updateThresholdLabel();
  });
  
  thresholdSlider.addEventListener('input', (e) => {
    thresholdInput.value = e.target.value;
    updateThresholdLabel();
  });
  
  form.addEventListener('submit', handleInitializeSubmit);
  
  // Add real-time validation to initial signer input
  setupSignerValidation();
}

function setupSignerValidation() {
  const signerInputs = document.querySelectorAll('.signer-input');
  signerInputs.forEach(input => {
    attachSignerValidation(input);
  });
}

function attachSignerValidation(input) {
  input.addEventListener('blur', function() {
    validateSignerInput(this);
  });
  
  input.addEventListener('input', function() {
    // Clear error state while typing
    this.classList.remove('has-error', 'has-success');
    const errorMsg = this.parentElement.querySelector('.form-error');
    if (errorMsg) errorMsg.remove();
    const successIcon = this.parentElement.querySelector('.validation-icon');
    if (successIcon) successIcon.remove();
  });
}

function validateSignerInput(input) {
  const value = input.value.trim();
  const parent = input.parentElement;
  
  // Remove existing validation
  input.classList.remove('has-error', 'has-success');
  const oldError = parent.querySelector('.form-error');
  if (oldError) oldError.remove();
  const oldIcon = parent.querySelector('.validation-icon');
  if (oldIcon) oldIcon.remove();
  
  if (!value) return;
  
  // Check if valid Stellar address
  if (!isValidStellarAddress(value)) {
    input.classList.add('has-error');
    const error = document.createElement('div');
    error.className = 'form-error';
    error.textContent = 'Must be 56 characters starting with G (uppercase only)';
    parent.appendChild(error);
    return false;
  }
  
  // Check for duplicates
  const allInputs = document.querySelectorAll('.signer-input');
  let duplicateFound = false;
  allInputs.forEach(otherInput => {
    if (otherInput !== input && otherInput.value.trim() === value) {
      duplicateFound = true;
    }
  });
  
  if (duplicateFound) {
    input.classList.add('has-error');
    const error = document.createElement('div');
    error.className = 'form-error';
    error.textContent = 'This address is already added';
    parent.appendChild(error);
    return false;
  }
  
  // Valid!
  input.classList.add('has-success');
  const icon = document.createElement('span');
  icon.className = 'validation-icon validation-icon--success';
  icon.innerHTML = '✓';
  icon.style.cssText = 'position: absolute; right: 48px; top: 50%; transform: translateY(-50%); color: var(--color-success); font-weight: bold; font-size: 18px;';
  parent.style.position = 'relative';
  parent.appendChild(icon);
  return true;
}

function addSignerInput() {
  if (signerCount >= VALIDATION.maxSigners) {
    showToast(`Maximum ${VALIDATION.maxSigners} signers allowed`, 'error');
    return;
  }
  
  // Validate previous inputs before adding new one
  const signerInputs = document.querySelectorAll('.signer-input');
  const lastInput = signerInputs[signerInputs.length - 1];
  
  if (lastInput && !lastInput.value.trim()) {
    showToast('Please fill in the current signer address first', 'error');
    lastInput.focus();
    return;
  }
  
  if (lastInput && !validateSignerInput(lastInput)) {
    showToast('Please fix the validation error before adding another signer', 'error');
    lastInput.focus();
    return;
  }
  
  const container = document.getElementById('signersContainer');
  const div = document.createElement('div');
  div.className = 'signer-input-group';
  div.innerHTML = `
    <input type="text" class="form-control signer-input" placeholder="Stellar address (G...)" required aria-label="Signer address" pattern="^G[A-Z2-7]{55}$">
    <button type="button" class="btn btn--secondary btn--icon remove-signer-btn" onclick="removeSignerInput(this)" aria-label="Remove signer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  container.appendChild(div);
  signerCount++;
  updateSignerCount();
  updateThresholdMax();
  
  // Focus new input and attach validation
  const newInput = div.querySelector('.signer-input');
  attachSignerValidation(newInput);
  newInput.focus();
}

function removeSignerInput(btn) {
  if (signerCount <= 1) {
    showToast('At least one signer is required', 'error');
    return;
  }
  btn.closest('.signer-input-group').remove();
  signerCount--;
  updateSignerCount();
  updateThresholdMax();
}

function updateSignerCount() {
  document.getElementById('signerCount').textContent = `${signerCount} signer${signerCount !== 1 ? 's' : ''} added`;
}

function updateThresholdMax() {
  const thresholdInput = document.getElementById('thresholdInput');
  const thresholdSlider = document.getElementById('thresholdSlider');
  thresholdInput.max = signerCount;
  thresholdSlider.max = signerCount;
  if (parseInt(thresholdInput.value) > signerCount) {
    thresholdInput.value = signerCount;
    thresholdSlider.value = signerCount;
  }
  updateThresholdLabel();
}

function updateThresholdLabel() {
  const value = document.getElementById('thresholdInput').value;
  document.getElementById('thresholdLabel').textContent = `Requires ${value} of ${signerCount} signatures`;
}

function handleInitializeSubmit(e) {
  e.preventDefault();
  
  const signerInputs = document.querySelectorAll('.signer-input');
  const signers = [];
  const seenAddresses = new Set();
  
  // Validate all signer addresses
  for (const input of signerInputs) {
    const address = input.value.trim();
    
    if (!isValidStellarAddress(address)) {
      showToast(ERRORS.invalidAddress, 'error');
      input.focus();
      return;
    }
    
    if (seenAddresses.has(address)) {
      showToast(ERRORS.duplicateSigner, 'error');
      input.focus();
      return;
    }
    
    seenAddresses.add(address);
    signers.push(address);
  }
  
  // Validate minimum signers
  if (signers.length < VALIDATION.minSigners) {
    showToast(ERRORS.insufficientSigners, 'error');
    return;
  }
  
  const threshold = parseInt(document.getElementById('thresholdInput').value);
  
  // Validate threshold
  if (threshold < 1 || threshold > signers.length) {
    showToast(ERRORS.invalidThreshold, 'error');
    return;
  }
  
  // Initialize wallet
  state.wallet = {
    contractAddress: generateStellarAddress().replace('G', 'C'),
    signers,
    threshold
  };
  
  // Save to sessionStorage
  saveStateToStorage();
  
  showToast('Multisig wallet initialized successfully!', 'success');
  showContentView('dashboard');
  
  // Re-enable submit button
  submitBtn.disabled = false;
  submitBtn.textContent = 'Initialize Multisig Wallet';
  
  // Reset form
  e.target.reset();
  const container = document.getElementById('signersContainer');
  container.innerHTML = `
    <div class="signer-input-group">
      <input type="text" class="form-control signer-input" placeholder="Stellar address (G...)" required>
      <button type="button" class="btn btn--secondary btn--icon remove-signer-btn" disabled>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  `;
  signerCount = 1;
  updateSignerCount();
  updateThresholdMax();
}

// Create Proposal Form
function setupCreateProposalForm() {
  const form = document.getElementById('createProposalForm');
  const tokenSelect = document.getElementById('tokenSelect');
  const customTokenGroup = document.getElementById('customTokenGroup');
  const recipientInput = document.getElementById('recipientInput');
  const amountInput = document.getElementById('amountInput');
  const customTokenInput = document.getElementById('customTokenInput');
  
  tokenSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customTokenGroup.style.display = 'block';
      customTokenInput.required = true;
    } else {
      customTokenGroup.style.display = 'none';
      customTokenInput.required = false;
    }
  });
  
  // Real-time validation for recipient
  recipientInput.addEventListener('blur', function() {
    validateRecipientInput(this);
  });
  
  recipientInput.addEventListener('input', function() {
    clearValidation(this);
  });
  
  // Real-time validation for amount
  amountInput.addEventListener('blur', function() {
    validateAmountInput(this);
  });
  
  amountInput.addEventListener('input', function() {
    clearValidation(this);
  });
  
  // Real-time validation for custom token
  customTokenInput.addEventListener('blur', function() {
    validateCustomTokenInput(this);
  });
  
  customTokenInput.addEventListener('input', function() {
    clearValidation(this);
  });
  
  form.addEventListener('submit', handleCreateProposal);
}

function clearValidation(input) {
  input.classList.remove('has-error', 'has-success');
  const parent = input.closest('.form-group');
  const errorMsg = parent.querySelector('.form-error');
  if (errorMsg) errorMsg.remove();
  const successIcon = parent.querySelector('.validation-icon');
  if (successIcon) successIcon.remove();
}

function showValidationError(input, message) {
  input.classList.add('has-error');
  input.classList.remove('has-success');
  const parent = input.closest('.form-group');
  let error = parent.querySelector('.form-error');
  if (!error) {
    error = document.createElement('div');
    error.className = 'form-error';
    parent.appendChild(error);
  }
  error.textContent = message;
  error.style.display = 'block';
}

function showValidationSuccess(input) {
  input.classList.add('has-success');
  input.classList.remove('has-error');
  const parent = input.closest('.form-group');
  const errorMsg = parent.querySelector('.form-error');
  if (errorMsg) errorMsg.style.display = 'none';
  
  // Add success checkmark
  let icon = parent.querySelector('.validation-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'validation-icon validation-icon--success';
    icon.innerHTML = '✓';
    icon.setAttribute('aria-label', 'Valid input');
    parent.appendChild(icon);
  }
}

function validateRecipientInput(input) {
  const value = input.value.trim();
  
  if (!value) return;
  
  if (!isValidStellarAddress(value)) {
    showValidationError(input, 'Recipient address must be 56 characters starting with G (uppercase only)');
    return false;
  }
  
  showValidationSuccess(input);
  return true;
}

function validateAmountInput(input) {
  const value = input.value.trim();
  
  if (!value) return;
  
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) {
    showValidationError(input, 'Amount must be a positive number');
    return false;
  }
  
  const decimals = (value.split('.')[1] || '').length;
  if (decimals > VALIDATION.maxDecimals) {
    showValidationError(input, `Amount can have maximum ${VALIDATION.maxDecimals} decimal places`);
    return false;
  }
  
  showValidationSuccess(input);
  return true;
}

function validateCustomTokenInput(input) {
  const value = input.value.trim();
  
  if (!value) return;
  
  if (!isValidContractAddress(value)) {
    showValidationError(input, 'Token address must be 56 characters starting with C (uppercase only)');
    return false;
  }
  
  showValidationSuccess(input);
  return true;
}

function handleCreateProposal(e) {
  e.preventDefault();
  
  if (!state.wallet) {
    showToast('Please initialize wallet first', 'error');
    showContentView('initialize');
    return;
  }
  
  const recipientInput = document.getElementById('recipientInput');
  const recipient = recipientInput.value.trim();
  const tokenSelect = document.getElementById('tokenSelect');
  const amountInput = document.getElementById('amountInput');
  const amount = amountInput.value;
  const description = document.getElementById('descriptionInput').value.trim();
  
  // Validate all fields
  let isValid = true;
  
  // Validate recipient address
  if (!isValidStellarAddress(recipient)) {
    showValidationError(recipientInput, 'Recipient address must be 56 characters starting with G (uppercase only)');
    isValid = false;
  }
  
  // Validate token
  let token = tokenSelect.value;
  if (token === 'custom') {
    const customTokenInput = document.getElementById('customTokenInput');
    token = customTokenInput.value.trim();
    if (!token || !isValidContractAddress(token)) {
      showValidationError(customTokenInput, 'Token address must be 56 characters starting with C (uppercase only)');
      isValid = false;
    }
  }
  
  // Validate amount
  if (!isValidAmount(amount)) {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      showValidationError(amountInput, 'Amount must be a positive number');
    } else {
      showValidationError(amountInput, `Amount can have maximum ${VALIDATION.maxDecimals} decimal places`);
    }
    isValid = false;
  }
  
  if (!isValid) {
    showToast('Please fix the validation errors', 'error');
    return;
  }
  
  // Disable submit button during processing
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';
  
  // Sanitize description input
  const sanitizedDescription = sanitizeInput(description);
  
  // Create proposal
  const newProposal = {
    id: state.proposals.length > 0 ? Math.max(...state.proposals.map(p => p.id)) + 1 : 1,
    to: recipient,
    token,
    amount,
    approvers: [state.walletAddress],
    executed: false,
    createdBy: state.walletAddress,
    createdAt: Date.now(),
    description: sanitizedDescription
  };
  
  state.proposals.push(newProposal);
  
  // Save to sessionStorage
  saveStateToStorage();
  
  showToast(`Proposal #${newProposal.id} created successfully!`, 'success');
  showContentView('proposals');
  
  // Reset form
  e.target.reset();
  document.getElementById('customTokenGroup').style.display = 'none';
  
  // Re-enable submit button
  submitBtn.disabled = false;
  submitBtn.textContent = 'Create Proposal';
  
  // Clear validation states
  const formGroups = e.target.querySelectorAll('.form-group');
  formGroups.forEach(group => {
    const input = group.querySelector('.form-control');
    if (input) clearValidation(input);
  });
}

// Proposals Rendering
function renderProposals() {
  const list = document.getElementById('proposalsList');
  
  if (!state.wallet) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <h3 class="empty-state-title">Wallet Not Initialized</h3>
        <p class="empty-state-desc">Initialize your multisig wallet first</p>
        <button class="btn btn--primary" style="margin-top: 16px;" onclick="showContentView('initialize')">Initialize Wallet</button>
      </div>
    `;
    return;
  }
  
  let filteredProposals = state.proposals;
  
  if (state.proposalFilter === 'pending') {
    filteredProposals = state.proposals.filter(p => !p.executed && p.approvers.length < state.wallet.threshold);
  } else if (state.proposalFilter === 'ready') {
    filteredProposals = state.proposals.filter(p => !p.executed && p.approvers.length >= state.wallet.threshold);
  } else if (state.proposalFilter === 'executed') {
    filteredProposals = state.proposals.filter(p => p.executed);
  }
  
  // Sort by creation date (newest first)
  filteredProposals = filteredProposals.sort((a, b) => b.createdAt - a.createdAt);
  
  if (filteredProposals.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3 class="empty-state-title">No Proposals Found</h3>
        <p class="empty-state-desc">Create your first transaction proposal</p>
        <button class="btn btn--primary" style="margin-top: 16px;" onclick="showContentView('create-proposal')">Create Proposal</button>
      </div>
    `;
    return;
  }
  
  // Update filter counts
  updateProposalFilterCounts();
  
  list.innerHTML = filteredProposals.map(proposal => {
    const progress = Math.min((proposal.approvers.length / state.wallet.threshold) * 100, 100);
    const isReady = proposal.approvers.length >= state.wallet.threshold;
    const hasApproved = proposal.approvers.includes(state.walletAddress);
    const canApprove = !proposal.executed && !hasApproved && state.wallet.signers.includes(state.walletAddress);
    const canExecute = !proposal.executed && isReady && state.wallet.signers.includes(state.walletAddress);
    
    // Determine current status for better UI feedback
    const approvalsNeeded = Math.max(0, state.wallet.threshold - proposal.approvers.length);
    
    let statusBadge = '';
    if (proposal.executed) {
      statusBadge = '<span class="status-badge status-badge--executed" role="status">Executed</span>';
    } else if (isReady) {
      statusBadge = '<span class="status-badge status-badge--ready" role="status">Ready to Execute</span>';
    } else {
      statusBadge = '<span class="status-badge status-badge--pending" role="status">Pending</span>';
    }
    
    const tokenName = proposal.token === 'NATIVE' ? 'XLM' : 
                      proposal.token === 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75' ? 'USDC' : 
                      truncateAddress(proposal.token);
    
    // Escape description to prevent XSS
    const safeDescription = proposal.description ? escapeHtml(proposal.description) : '';
    
    return `
      <div class="proposal-card">
        <div class="proposal-header">
          <div class="proposal-id">Proposal #${proposal.id}</div>
          ${statusBadge}
        </div>
        
        <div class="proposal-details">
          <div class="detail-row">
            <span class="detail-label">To:</span>
            <span class="detail-value">${truncateAddress(proposal.to)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${proposal.amount} ${tokenName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Created:</span>
            <span class="detail-value">${formatDate(proposal.createdAt)}</span>
          </div>
          ${safeDescription ? `
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value" style="font-family: var(--font-family-base);">${safeDescription}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="progress-section">
          <div class="progress-label">
            Approvals: ${proposal.approvers.length} / ${state.wallet.threshold}
            ${!proposal.executed && approvalsNeeded > 0 ? `<span style="color: var(--color-text-secondary); margin-left: 8px;">(${approvalsNeeded} more needed)</span>` : ''}
            ${!proposal.executed && isReady ? '<span style="color: var(--color-success); margin-left: 8px; font-weight: var(--font-weight-semibold);">✓ Ready for execution</span>' : ''}
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%; background: ${isReady ? 'var(--color-success)' : 'var(--color-primary)'}"></div>
          </div>
          ${proposal.approvers.length > 0 ? `
            <div class="approvers-list">
              ${proposal.approvers.map(addr => `
                <div class="approver-chip">
                  ✓ ${truncateAddress(addr)}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="proposal-actions">
          ${canApprove ? `
            <button class="btn btn--success" onclick="approveProposal(${proposal.id})">Approve</button>
          ` : ''}
          ${canExecute ? `
            <button class="btn btn--primary" onclick="executeProposal(${proposal.id})">Execute</button>
          ` : ''}
          <button class="btn btn--secondary" onclick="showProposalDetails(${proposal.id})">View Details</button>
        </div>
      </div>
    `;
  }).join('');
}

function setupProposalFilters() {
  const filters = document.querySelectorAll('.filter-tab');
  filters.forEach(filter => {
    filter.addEventListener('click', (e) => {
      filters.forEach(f => f.classList.remove('filter-tab--active'));
      e.target.classList.add('filter-tab--active');
      state.proposalFilter = e.target.dataset.filter;
      renderProposals();
    });
  });
}

function updateProposalFilterCounts() {
  if (!state.wallet) return;
  
  const pending = state.proposals.filter(p => !p.executed && p.approvers.length < state.wallet.threshold).length;
  const ready = state.proposals.filter(p => !p.executed && p.approvers.length >= state.wallet.threshold).length;
  const executed = state.proposals.filter(p => p.executed).length;
  
  const filters = document.querySelectorAll('.filter-tab');
  filters.forEach(filter => {
    const filterType = filter.dataset.filter;
    const currentText = filter.textContent.split(' ')[0];
    
    if (filterType === 'all') {
      filter.textContent = `All (${state.proposals.length})`;
    } else if (filterType === 'pending') {
      filter.textContent = `Pending (${pending})`;
    } else if (filterType === 'ready') {
      filter.textContent = `Ready (${ready})`;
    } else if (filterType === 'executed') {
      filter.textContent = `Executed (${executed})`;
    }
  });
}

async function approveProposal(proposalId) {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) return;
  
  if (proposal.approvers.includes(state.walletAddress)) {
    showToast('You have already approved this proposal', 'error');
    return;
  }
  
  if (!state.wallet.signers.includes(state.walletAddress)) {
    showToast('You are not authorized to approve this proposal', 'error');
    return;
  }
  
  // Disable button during processing
  const buttons = document.querySelectorAll(`button[onclick="approveProposal(${proposalId})"]`);
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Approving...';
  });
  
  try {
    // In production, this would sign with Freighter
    // For demo, we simulate approval
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!state.isMounted) return;
    
    proposal.approvers.push(state.walletAddress);
    
    // Check if threshold is now met
    const isNowReady = proposal.approvers.length >= state.wallet.threshold;
    
    // Save to sessionStorage
    saveStateToStorage();
    
    if (isNowReady) {
      showToast(`Proposal #${proposalId} approved! Ready for execution (${proposal.approvers.length}/${state.wallet.threshold})`, 'success');
    } else {
      const remaining = state.wallet.threshold - proposal.approvers.length;
      showToast(`Proposal #${proposalId} approved! ${remaining} more approval${remaining !== 1 ? 's' : ''} needed`, 'success');
    }
    
    renderProposals();
    if (state.currentView === 'dashboard') renderDashboard();
    
  } catch (error) {
    console.error('Approval error:', error);
    showToast('Failed to approve proposal', 'error');
  } finally {
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Approve';
    });
  }
}

async function executeProposal(proposalId) {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) return;
  
  if (proposal.approvers.length < state.wallet.threshold) {
    showToast('Threshold not met', 'error');
    return;
  }
  
  if (!state.wallet.signers.includes(state.walletAddress)) {
    showToast('You are not authorized to execute this proposal', 'error');
    return;
  }
  
  // Confirmation dialog
  const tokenName = proposal.token === 'NATIVE' ? 'XLM' : truncateAddress(proposal.token);
  const confirmed = confirm(
    `Execute transaction?\n\n` +
    `Recipient: ${proposal.to}\n` +
    `Amount: ${proposal.amount} ${tokenName}\n\n` +
    `This action cannot be undone.`
  );
  
  if (!confirmed) return;
  
  // Disable button during processing
  const buttons = document.querySelectorAll(`button[onclick="executeProposal(${proposalId})"]`);
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.textContent = 'Executing...';
  });
  
  try {
    // In production, this would submit transaction via Freighter
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!state.isMounted) return;
    
    proposal.executed = true;
    proposal.executedAt = Date.now();
    proposal.transactionHash = Array.from({length: 64}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    // Save to sessionStorage
    saveStateToStorage();
    
    showToast(`Proposal #${proposalId} executed successfully!`, 'success');
    renderProposals();
    if (state.currentView === 'dashboard') renderDashboard();
    
  } catch (error) {
    console.error('Execution error:', error);
    showToast('Failed to execute proposal', 'error');
  } finally {
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Execute';
    });
  }
}

function showProposalDetails(proposalId) {
  const proposal = state.proposals.find(p => p.id === proposalId);
  if (!proposal) return;
  
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  
  const tokenName = proposal.token === 'NATIVE' ? 'XLM Native' : 
                    proposal.token === 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75' ? 'USDC' : 
                    'Custom Token';
  
  // Escape description for modal
  const safeDescription = proposal.description ? escapeHtml(proposal.description) : '';
  
  const pendingSigners = state.wallet.signers.filter(s => !proposal.approvers.includes(s));
  
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">Proposal #${proposal.id} Details</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="info-section">
        <div class="info-card">
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value">
              ${proposal.executed ? 
                '<span class="status-badge status-badge--executed">Executed</span>' :
                proposal.approvers.length >= state.wallet.threshold ?
                '<span class="status-badge status-badge--ready">Ready to Execute</span>' :
                '<span class="status-badge status-badge--pending">Pending</span>'
              }
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Recipient</span>
            <span class="info-value">
              ${proposal.to}
              <button class="copy-btn" onclick="copyToClipboard('${proposal.to}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Token</span>
            <span class="info-value">${tokenName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Token Address</span>
            <span class="info-value">
              ${proposal.token}
              <button class="copy-btn" onclick="copyToClipboard('${proposal.token}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Amount</span>
            <span class="info-value">${proposal.amount}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Created By</span>
            <span class="info-value">${truncateAddress(proposal.createdBy)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Created At</span>
            <span class="info-value">${formatDate(proposal.createdAt)}</span>
          </div>
          ${proposal.executed ? `
            <div class="info-row">
              <span class="info-label">Executed At</span>
              <span class="info-value">${formatDate(proposal.executedAt)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Transaction Hash</span>
              <span class="info-value" style="word-break: break-all;">
                ${proposal.transactionHash}
                <button class="copy-btn" onclick="copyToClipboard('${proposal.transactionHash}')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </span>
            </div>
          ` : ''}
          ${safeDescription ? `
            <div class="info-row">
              <span class="info-label">Description</span>
              <span class="info-value" style="font-family: var(--font-family-base);">${safeDescription}</span>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${proposal.approvers.length > 0 ? `
        <div class="info-section">
          <h4 class="info-section-title">Approvers (${proposal.approvers.length}/${state.wallet.threshold})</h4>
          <div class="signers-grid">
            ${proposal.approvers.map(addr => `
              <div class="signer-card">
                <span class="signer-address">${truncateAddress(addr, 10, 6)}</span>
                <span class="signer-badge">✓ Approved</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${pendingSigners.length > 0 && !proposal.executed ? `
        <div class="info-section">
          <h4 class="info-section-title">Pending Signatures (${pendingSigners.length})</h4>
          <div class="signers-grid">
            ${pendingSigners.map(addr => `
              <div class="signer-card">
                <span class="signer-address">${truncateAddress(addr, 10, 6)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="modal-actions">
      ${!proposal.executed && !proposal.approvers.includes(state.walletAddress) && state.wallet.signers.includes(state.walletAddress) ? `
        <button class="btn btn--success" onclick="approveProposal(${proposal.id}); closeModal(); renderProposals();">Approve</button>
      ` : ''}
      ${!proposal.executed && proposal.approvers.length >= state.wallet.threshold && state.wallet.signers.includes(state.walletAddress) ? `
        <button class="btn btn--primary" onclick="executeProposal(${proposal.id}); closeModal(); renderProposals();">Execute</button>
      ` : ''}
      <button class="btn btn--secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  
  modal.classList.add('modal--show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('modal--show');
}

// Wallet Info Rendering
function renderWalletInfo() {
  const display = document.getElementById('walletInfoDisplay');
  
  if (!state.wallet) {
    display.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔐</div>
        <h3 class="empty-state-title">Wallet Not Initialized</h3>
        <p class="empty-state-desc">Initialize your multisig wallet to view information</p>
        <button class="btn btn--primary" style="margin-top: 16px;" onclick="showContentView('initialize')">Initialize Wallet</button>
      </div>
    `;
    return;
  }
  
  display.innerHTML = `
    <div class="info-section">
      <h3 class="info-section-title">Contract Information</h3>
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Contract Address</span>
          <span class="info-value">
            ${state.wallet.contractAddress}
            <button class="copy-btn" onclick="copyToClipboard('${state.wallet.contractAddress}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Number of Signers</span>
          <span class="info-value">${state.wallet.signers.length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Approval Threshold</span>
          <span class="info-value">${state.wallet.threshold} of ${state.wallet.signers.length}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Proposals</span>
          <span class="info-value">${state.proposals.length}</span>
        </div>
      </div>
    </div>
    
    <div class="info-section">
      <h3 class="info-section-title">Authorized Signers</h3>
      <div class="signers-grid">
        ${state.wallet.signers.map((addr, index) => `
          <div class="signer-card">
            <span class="signer-address">${truncateAddress(addr, 10, 6)}</span>
            ${addr === state.walletAddress ? '<span class="signer-badge">You</span>' : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Navigation Setup
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view) {
        showContentView(view);
      }
    });
  });
}

// Modal Overlay Click
function setupModal() {
  const overlay = document.querySelector('.modal-overlay');
  overlay.addEventListener('click', closeModal);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  state.isMounted = false;
  disconnectWallet();
});

// Initialize App
function init() {
  state.isMounted = true;
  
  // Try to restore state from sessionStorage
  const hasRestoredState = loadStateFromStorage();
  
  // Set up welcome connect button
  document.getElementById('welcomeConnectBtn').addEventListener('click', connectWallet);
  
  // Setup forms
  setupInitializeForm();
  setupCreateProposalForm();
  setupProposalFilters();
  
  // Setup navigation
  setupNavigation();
  
  // Setup modal
  setupModal();
  
  // Show appropriate view based on restored state
  if (hasRestoredState && state.connected && state.walletAddress) {
    updateWalletUI();
    showView('dashboard');
    showToast('Session restored', 'info');
  } else {
    showView('welcome');
  }
  
  // Check for Freighter on load
  if (window.freighterApi) {
    console.log('Freighter detected');
  } else {
    console.log('Freighter not detected - install from https://freighter.app');
    // Show a subtle notification
    setTimeout(() => {
      if (!window.freighterApi && !state.connected) {
        const networkBadge = document.getElementById('networkBadge');
        if (networkBadge) {
          networkBadge.textContent = 'Freighter Not Detected';
          networkBadge.style.cursor = 'pointer';
          networkBadge.title = 'Click to install Freighter wallet';
          networkBadge.onclick = () => window.open('https://freighter.app', '_blank');
        }
      }
    }, 1000);
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}