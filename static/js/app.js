document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdateId = null;

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMsg = document.getElementById('error-msg');
    const retryBtn = document.getElementById('retry-btn');
    const updatesGrid = document.getElementById('updates-grid');
    
    // Stats Elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statAnnouncements = document.getElementById('stat-announcements');
    const statChanges = document.getElementById('stat-changes');
    const statResolved = document.getElementById('stat-resolved');

    // Tweet Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCountEl = document.getElementById('char-count');
    const charCounterWrapper = document.querySelector('.char-counter');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const resetTweetBtn = document.getElementById('reset-tweet-btn');
    const tweetSubmitBtn = document.getElementById('tweet-submit-btn');

    // Initialize
    fetchReleaseNotes();

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        const refreshIcon = refreshBtn.querySelector('.icon-refresh');
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        fetchReleaseNotes().finally(() => {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        });
    });

    retryBtn.addEventListener('click', fetchReleaseNotes);

    exportCsvBtn.addEventListener('click', exportToCSV);

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderUpdates();
    });

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.getAttribute('data-type');
            renderUpdates();
        });
    });

    // Tweet Composer Handlers
    tweetTextarea.addEventListener('input', updateCharCount);
    
    closeDrawerBtn.addEventListener('click', clearSelection);
    
    resetTweetBtn.addEventListener('click', () => {
        if (!selectedUpdateId) return;
        const update = allUpdates.find(u => u.id === selectedUpdateId);
        if (update) {
            tweetTextarea.value = generateDefaultTweetText(update);
            updateCharCount();
        }
    });

    tweetSubmitBtn.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (text.length === 0) return;
        if (text.length > 280) {
            alert("Your tweet exceeds the 280-character limit.");
            return;
        }
        
        // Open Twitter Web Intent
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    });

    // Core Fetch & Parse Function
    async function fetchReleaseNotes() {
        showLoading();
        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();
            
            if (data.status === 'success') {
                processEntries(data.entries);
                updateStats();
                renderUpdates();
                hideLoading();
            } else {
                showError(data.message || 'Failed to fetch release notes.');
            }
        } catch (err) {
            showError('Network error occurred. Please make sure Flask server is running.');
            console.error(err);
        }
    }

    // Process XML Atom entries into discrete sub-updates
    function processEntries(entries) {
        allUpdates = [];
        const parser = new DOMParser();

        entries.forEach(entry => {
            if (!entry.content) return;
            
            // Standardize entry content wrapping
            const doc = parser.parseFromString(entry.content, 'text/html');
            const children = Array.from(doc.body.children);
            let currentUpdate = null;
            let counter = 0;

            children.forEach(child => {
                if (child.tagName === 'H3') {
                    if (currentUpdate) {
                        allUpdates.push(currentUpdate);
                    }
                    const rawType = child.innerText.trim();
                    // Map unknown types gracefully
                    const type = mapUpdateType(rawType);
                    
                    currentUpdate = {
                        id: `${entry.id}-${type}-${counter++}`,
                        date: entry.title,
                        type: type,
                        html: '',
                        text: '',
                        link: entry.link
                    };
                } else {
                    if (!currentUpdate) {
                        currentUpdate = {
                            id: `${entry.id}-General-${counter++}`,
                            date: entry.title,
                            type: 'General',
                            html: '',
                            text: '',
                            link: entry.link
                        };
                    }
                    currentUpdate.html += child.outerHTML;
                    currentUpdate.text += child.innerText.trim() + ' ';
                }
            });

            if (currentUpdate) {
                allUpdates.push(currentUpdate);
            }
        });
    }

    function mapUpdateType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'Feature';
        if (t.includes('announcement')) return 'Announcement';
        if (t.includes('change')) return 'Change';
        if (t.includes('deprecat')) return 'Deprecated';
        if (t.includes('resolve')) return 'Resolved';
        return 'General';
    }

    // Stats calculations
    function updateStats() {
        statTotal.textContent = allUpdates.length;
        statFeatures.textContent = allUpdates.filter(u => u.type === 'Feature').length;
        statAnnouncements.textContent = allUpdates.filter(u => u.type === 'Announcement').length;
        statChanges.textContent = allUpdates.filter(u => u.type === 'Change').length;
        statResolved.textContent = allUpdates.filter(u => u.type === 'Resolved').length;
    }

    // Render cards to Grid
    function renderUpdates() {
        updatesGrid.innerHTML = '';
        
        const filtered = allUpdates.filter(u => {
            const matchesType = activeFilter === 'all' || u.type === activeFilter;
            const matchesSearch = u.text.toLowerCase().includes(searchQuery) || 
                                 u.type.toLowerCase().includes(searchQuery) ||
                                 u.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });

        if (filtered.length === 0) {
            updatesGrid.innerHTML = `
                <div class="loading-state">
                    <h3>No updates found</h3>
                    <p>Try adjustments to your search queries or category filters.</p>
                </div>
            `;
            return;
        }

        filtered.forEach(update => {
            const isSelected = selectedUpdateId === update.id;
            
            const card = document.createElement('div');
            card.className = `update-card ${isSelected ? 'selected' : ''}`;
            card.dataset.id = update.id;
            
            card.innerHTML = `
                <div class="card-header">
                    <span class="badge badge-${update.type.toLowerCase()}">${update.type}</span>
                    <span class="card-date">${update.date}</span>
                </div>
                <div class="card-body">
                    ${update.html}
                </div>
                <div class="card-footer">
                    <div class="select-wrapper">
                        <div class="checkbox-custom">
                            <svg viewBox="0 0 24 24" width="12" height="12">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        </div>
                        <span class="select-label">${isSelected ? 'Selected' : 'Select to Tweet'}</span>
                    </div>
                    <div class="card-actions">
                        <button class="action-btn-circle copy-btn" title="Copy text to clipboard">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                        </button>
                        <button class="action-btn-circle tweet-btn" title="Tweet this update directly">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Card body click handlers for link compatibility
            card.querySelector('.card-body').addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    // Allow normal links opening in new tab
                    e.target.setAttribute('target', '_blank');
                    e.stopPropagation();
                }
            });

            // Card click handlers
            card.addEventListener('click', (e) => {
                // Prevent trigger when clicking links or individual action buttons
                if (e.target.closest('a') || e.target.closest('.tweet-btn') || e.target.closest('.copy-btn')) return;
                toggleSelectCard(update);
            });

            // Copy button click handler
            card.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(update, card.querySelector('.copy-btn'));
            });

            // Individual tweet button click handler
            card.querySelector('.tweet-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openTweetComposer(update);
            });

            updatesGrid.appendChild(card);
        });
    }

    // Select/Deselect Action
    function toggleSelectCard(update) {
        if (selectedUpdateId === update.id) {
            clearSelection();
        } else {
            selectedUpdateId = update.id;
            renderUpdates();
            openTweetComposer(update);
        }
    }

    function clearSelection() {
        selectedUpdateId = null;
        renderUpdates();
        tweetDrawer.classList.add('hidden');
    }

    function openTweetComposer(update) {
        selectedUpdateId = update.id;
        // Make sure class is updated for selected styles
        const cards = document.querySelectorAll('.update-card');
        cards.forEach(c => {
            if (c.dataset.id === update.id) {
                c.classList.add('selected');
                c.querySelector('.select-label').textContent = 'Selected';
            } else {
                c.classList.remove('selected');
                c.querySelector('.select-label').textContent = 'Select to Tweet';
            }
        });
        
        tweetTextarea.value = generateDefaultTweetText(update);
        updateCharCount();
        tweetDrawer.classList.remove('hidden');
        tweetTextarea.focus();
    }

    // Default Tweet Text Generator
    function generateDefaultTweetText(update) {
        const prefix = `BigQuery ${update.type} (${update.date}): `;
        const suffix = `\nRead more: ${update.link} #BigQuery #GoogleCloud`;
        const maxLength = 280;
        
        // Clean double spaces or line breaks
        let cleanText = update.text.replace(/\s+/g, ' ').trim();
        
        const availableLength = maxLength - prefix.length - suffix.length;
        
        if (cleanText.length > availableLength) {
            cleanText = cleanText.substring(0, availableLength - 3) + '...';
        }
        
        return `${prefix}${cleanText}${suffix}`;
    }

    // Textarea char counter update
    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCountEl.textContent = len;
        
        charCounterWrapper.classList.remove('warning', 'danger');
        tweetSubmitBtn.disabled = len === 0 || len > 280;

        if (len > 250 && len <= 280) {
            charCounterWrapper.classList.add('warning');
        } else if (len > 280) {
            charCounterWrapper.classList.add('danger');
        }
    }

    function copyToClipboard(update, button) {
        const textToCopy = `[BigQuery ${update.type} - ${update.date}]\n${update.text.replace(/\s+/g, ' ').trim()}\n\nSource: ${update.link}`;
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg viewBox="0 0 24 24" width="14" height="14" style="fill: #10b981;">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;
            button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
            button.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            button.style.color = '#10b981';
            button.title = "Copied!";
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.borderColor = '';
                button.style.backgroundColor = '';
                button.style.color = '';
                button.title = "Copy text to clipboard";
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            alert('Failed to copy to clipboard.');
        });
    }

    function exportToCSV() {
        const filtered = allUpdates.filter(u => {
            const matchesType = activeFilter === 'all' || u.type === activeFilter;
            const matchesSearch = u.text.toLowerCase().includes(searchQuery) || 
                                 u.type.toLowerCase().includes(searchQuery) ||
                                 u.date.toLowerCase().includes(searchQuery);
            return matchesType && matchesSearch;
        });

        if (filtered.length === 0) {
            alert('No records available to export.');
            return;
        }

        const csvHeaders = ['Date', 'Category', 'Update Text', 'Link'];
        const csvRows = [csvHeaders.join(',')];

        filtered.forEach(u => {
            const date = `"${u.date.replace(/"/g, '""')}"`;
            const type = `"${u.type.replace(/"/g, '""')}"`;
            const text = `"${u.text.replace(/\s+/g, ' ').replace(/"/g, '""').trim()}"`;
            const link = `"${u.link.replace(/"/g, '""')}"`;
            csvRows.push([date, type, text, link].join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `bigquery_release_notes_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // UI State Toggles
    function showLoading() {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        updatesGrid.classList.add('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
        updatesGrid.classList.remove('hidden');
    }

    function showError(msg) {
        loadingState.classList.add('hidden');
        updatesGrid.classList.add('hidden');
        errorMsg.textContent = msg;
        errorState.classList.remove('hidden');
    }
});
