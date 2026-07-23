let allResults = [];
let allTaxonomies = [];

// Fetch taxonomies on load
async function fetchTaxonomies() {
    try {
        const response = await fetch('/api/taxonomies');
        if (response.ok) {
            allTaxonomies = await response.json();
            console.log(`Loaded ${allTaxonomies.length} taxonomies`);
        } else {
            console.error("Failed to load taxonomies");
        }
    } catch (error) {
        console.error("Error loading taxonomies:", error);
    }
}

fetchTaxonomies();

// DOM Elements
const searchBtn = document.getElementById('searchBtn');
const downloadBtn = document.getElementById('downloadBtn');
const taxonomyInput = document.getElementById('taxonomyInput');
const statusCard = document.getElementById('statusCard');
const resultsCard = document.getElementById('resultsCard');
const statusMessage = document.getElementById('statusMessage');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsBody = document.getElementById('resultsBody');
const resultsSummary = document.getElementById('resultsSummary');
const taxonomyDropdown = document.getElementById('taxonomyDropdown');

// Autocomplete state
let currentFocus = -1;
let selectedTaxonomies = new Set();

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
downloadBtn.addEventListener('click', showEmailModal);

// Autocomplete Event Listeners
taxonomyInput.addEventListener('input', handleTaxonomyInput);
taxonomyInput.addEventListener('keydown', handleTaxonomyKeydown);
taxonomyInput.addEventListener('focus', handleTaxonomyFocus);

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-container') && !e.target.closest('.multi-select-container')) {
        hideAutocomplete();
    }
});

// Focus input when clicking container
document.getElementById('taxonomyContainer').addEventListener('click', () => {
    taxonomyInput.focus();
});

// Autocomplete Functions
function handleTaxonomyInput(e) {
    const value = e.target.value.trim().toLowerCase();
    currentFocus = -1;

    if (!value) {
        hideAutocomplete();
        return;
    }

    const matches = [];
    for (const tax of allTaxonomies) {
        if (matches.length >= 50) break;
        if (tax.desc.toLowerCase().includes(value) || tax.code.toLowerCase().includes(value)) {
            matches.push(tax);
        }
    }

    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }

    showAutocomplete(matches);
}

function handleTaxonomyFocus(e) {
    if (taxonomyInput.value.trim()) {
        handleTaxonomyInput(e);
    } else {
        showAutocomplete(allTaxonomies.slice(0, 50));
    }
}

function handleTaxonomyKeydown(e) {
    const items = taxonomyDropdown.querySelectorAll('.autocomplete-item');

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentFocus++;
        if (currentFocus >= items.length) currentFocus = 0;
        setActiveItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentFocus--;
        if (currentFocus < 0) currentFocus = items.length - 1;
        setActiveItem(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentFocus > -1 && items[currentFocus]) {
            items[currentFocus].click();
        } else if (taxonomyInput.value) {
            addTaxonomy(taxonomyInput.value);
            taxonomyInput.value = '';
            hideAutocomplete();
        }
    } else if (e.key === 'Escape') {
        hideAutocomplete();
    } else if (e.key === 'Backspace' && !taxonomyInput.value && selectedTaxonomies.size > 0) {
        const lastTag = Array.from(selectedTaxonomies).pop();
        removeTaxonomy(lastTag);
    }
}

function setActiveItem(items) {
    items.forEach((item, index) => {
        if (index === currentFocus) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}

function showAutocomplete(matches) {
    taxonomyDropdown.innerHTML = '';
    taxonomyDropdown.classList.remove('hidden');

    matches.forEach(tax => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `<strong>${tax.desc}</strong> <small>(${tax.code})</small>`;
        item.addEventListener('click', () => {
            addTaxonomy(tax.desc);
            taxonomyInput.value = '';
            hideAutocomplete();
        });
        taxonomyDropdown.appendChild(item);
    });
}

function addTaxonomy(value) {
    value = value.trim();
    if (!value || selectedTaxonomies.has(value)) return;

    selectedTaxonomies.add(value);
    renderTags();
}

function removeTaxonomy(value) {
    selectedTaxonomies.delete(value);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('selectedTags');
    container.innerHTML = '';

    selectedTaxonomies.forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag';
        tagEl.innerHTML = `
            ${tag}
            <span class="tag-remove" onclick="removeTaxonomy('${tag.replace(/'/g, "\\'")}')">&times;</span>
        `;
        container.appendChild(tagEl);
    });
}

function hideAutocomplete() {
    taxonomyDropdown.classList.add('hidden');
    taxonomyDropdown.innerHTML = '';
    currentFocus = -1;
}

async function handleSearch() {
    allResults = [];
    resultsCard.classList.add('hidden');

    const zipcodesText = document.getElementById('zipcodes').value.trim();

    const filters = {
        npiNumber: document.getElementById('npiNumber').value.trim(),
        npiType: document.getElementById('npiType').value,
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        orgName: document.getElementById('orgName').value.trim(),
        state: document.getElementById('state').value,
        limit: document.getElementById('limit').value
    };

    if (!zipcodesText) {
        alert('Please enter at least one zip code');
        return;
    }

    const zipcodes = zipcodesText.split('\n')
        .map(z => z.trim())
        .filter(z => z.length > 0);

    if (zipcodes.length === 0) {
        alert('Please enter at least one valid zip code');
        return;
    }

    statusCard.classList.remove('hidden');
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';

    let completed = 0;
    const total = zipcodes.length;

    if (selectedTaxonomies.size === 0 && document.getElementById('taxonomyInput').value.trim()) {
        selectedTaxonomies.add(document.getElementById('taxonomyInput').value.trim());
    }

    const taxonomiesList = selectedTaxonomies.size > 0 ? Array.from(selectedTaxonomies) : [null];

    for (const zipcode of zipcodes) {
        for (const tax of taxonomiesList) {
            const taxLabel = tax ? ` for ${tax}` : '';
            updateStatus(`Searching ${zipcode}${taxLabel}... (${completed + 1}/${total})`, completed, total);

            try {
                const currentFilters = { ...filters };
                if (tax) currentFilters.taxonomy_description = tax;

                const results = await searchNPI(zipcode, currentFilters);

                results.forEach(r => {
                    if (!allResults.some(existing => existing.number === r.number)) {
                        allResults.push(r);
                    }
                });

            } catch (error) {
                console.error(`Error searching ${zipcode} ${taxLabel}:`, error);
            }

            await sleep(100);
        }

        completed++;
        updateStatus(`Completed ${completed}/${total} zip codes`, completed, total);
    }

    displayResults();
    searchBtn.disabled = false;
    searchBtn.innerHTML = '<span class="btn-icon">🔍</span> Start Batch Search';
    updateStatus(`Search complete! Found ${allResults.length} providers.`, total, total);
}

async function searchNPI(zipcode, filters) {
    let results = [];
    let skip = 0;
    const isMax = filters.limit === 'max';
    const limitPerRequest = isMax ? 200 : parseInt(filters.limit);
    const maxSkip = 1000;

    let keepFetching = true;

    while (keepFetching) {
        const params = new URLSearchParams({
            version: '2.1',
            postal_code: zipcode,
            country_code: 'US',
            limit: limitPerRequest,
            skip: skip
        });

        if (filters.npiNumber) params.append('number', filters.npiNumber);
        if (filters.taxonomy_description) params.append('taxonomy_description', filters.taxonomy_description);
        if (filters.npiType) params.append('enumeration_type', filters.npiType);
        if (filters.firstName) params.append('first_name', filters.firstName);
        if (filters.lastName) params.append('last_name', filters.lastName);
        if (filters.orgName) params.append('organization_name', filters.orgName);
        if (filters.state) params.append('state', filters.state);

        const response = await fetch(`/api/npi?${params}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const batch = data.results || [];
        results.push(...batch);

        if (!isMax || batch.length < limitPerRequest || skip >= maxSkip) {
            keepFetching = false;
        } else {
            skip += limitPerRequest;
            await sleep(100);
        }
    }

    return results;
}

function displayResults() {
    if (allResults.length === 0) {
        resultsSummary.innerHTML = '<p>No results found.</p>';
        resultsCard.classList.remove('hidden');
        return;
    }

    const uniqueZips = new Set(allResults.map(r => {
        const addresses = r.addresses || [];
        const primaryAddr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {};
        return primaryAddr.postal_code || '';
    }));

    resultsSummary.innerHTML = `
        <strong>${allResults.length}</strong> providers found across <strong>${uniqueZips.size}</strong> zip codes
    `;

    resultsBody.innerHTML = '';
    allResults.forEach(provider => {
        const row = createTableRow(provider);
        resultsBody.appendChild(row);
    });

    resultsCard.classList.remove('hidden');
}

function createTableRow(provider) {
    const basic = provider.basic || {};
    const addresses = provider.addresses || [];
    const taxonomies = provider.taxonomies || [];

    const locationAddr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {};
    const mailingAddr = addresses.find(a => a.address_purpose === 'MAILING') || {};
    const primaryTax = taxonomies.find(t => t.primary) || taxonomies[0] || {};

    const firstName = basic.first_name || '';
    const lastName = basic.last_name || '';
    const orgName = basic.organization_name || '';
    const name = orgName || `${firstName} ${lastName}`.trim();

    const row = document.createElement('tr');
    const status = basic.status === 'A' ? '<span class="status-active">Active</span>' : `<span class="status-inactive">${basic.status || 'Unknown'}</span>`;

    const locationFull = `
        <div><strong>Location:</strong><br>
        ${locationAddr.address_1 || ''} ${locationAddr.address_2 || ''}<br>
        ${locationAddr.city || ''}, ${locationAddr.state || ''} ${formatZipCode(locationAddr.postal_code)}
        </div>
    `;

    const mailingFull = mailingAddr.address_1 ? `
        <div style="margin-top: 8px; border-top: 1px solid #eee; padding-top: 4px;">
        <strong>Mailing:</strong><br>
        ${mailingAddr.address_1 || ''} ${mailingAddr.address_2 || ''}<br>
        ${mailingAddr.city || ''}, ${mailingAddr.state || ''} ${formatZipCode(mailingAddr.postal_code)}
        </div>
    ` : '';

    const combinedAddress = locationFull + mailingFull;

    const displayCells = [
        provider.number || '',
        status,
        name,
        provider.enumeration_type || '',
        primaryTax.desc || '',
        combinedAddress,
        locationAddr.telephone_number || ''
    ];

    displayCells.forEach(cellContent => {
        const td = document.createElement('td');
        td.innerHTML = cellContent;
        row.appendChild(td);
    });

    return row;
}

function downloadCSV() {
    if (allResults.length === 0) {
        alert('No results to download');
        return;
    }

    const headers = [
        'NPI', 'Status', 'Enumeration Type', 'First Name', 'Last Name', 'Organization Name',
        'Credential', 'Gender', 'Primary Taxonomy Code', 'Primary Taxonomy Description',
        'Location Address 1', 'Location Address 2', 'Location City', 'Location State',
        'Location Postal Code', 'Location Phone', 'Location Fax',
        'Mailing Address 1', 'Mailing Address 2', 'Mailing City', 'Mailing State',
        'Mailing Postal Code', 'Mailing Phone', 'Mailing Fax'
    ];

    const rows = allResults.map(provider => {
        const basic = provider.basic || {};
        const addresses = provider.addresses || [];
        const taxonomies = provider.taxonomies || [];

        const locationAddr = addresses.find(a => a.address_purpose === 'LOCATION') || addresses[0] || {};
        const mailingAddr = addresses.find(a => a.address_purpose === 'MAILING') || {};
        const primaryTax = taxonomies.find(t => t.primary) || taxonomies[0] || {};

        return [
            provider.number || '', basic.status || '', provider.enumeration_type || '',
            basic.first_name || '', basic.last_name || '', basic.organization_name || '',
            basic.credential || '', basic.gender || '', primaryTax.code || '', primaryTax.desc || '',
            locationAddr.address_1 || '', locationAddr.address_2 || '', locationAddr.city || '',
            locationAddr.state || '', formatZipCode(locationAddr.postal_code),
            locationAddr.telephone_number || '', locationAddr.fax_number || '',
            mailingAddr.address_1 || '', mailingAddr.address_2 || '', mailingAddr.city || '',
            mailingAddr.state || '', formatZipCode(mailingAddr.postal_code),
            mailingAddr.telephone_number || '', mailingAddr.fax_number || ''
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            const escaped = String(cell).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `npi_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function updateStatus(message, current, total) {
    statusMessage.textContent = message;
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
}

function formatZipCode(zip) {
    if (!zip) return '';
    const cleaned = zip.toString().replace(/[-\s]/g, '');
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    }
    return cleaned;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Email Modal Functions
const emailModal = document.getElementById('emailModal');
const userEmailInput = document.getElementById('userEmail');
const emailError = document.getElementById('emailError');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');

function showEmailModal() {
    if (allResults.length === 0) {
        alert('No results to download');
        return;
    }
    emailModal.classList.remove('hidden');
    userEmailInput.value = '';
    emailError.classList.add('hidden');
    userEmailInput.focus();
}

function hideEmailModal() {
    emailModal.classList.add('hidden');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

async function handleEmailSubmit() {
    const email = userEmailInput.value.trim();

    if (!validateEmail(email)) {
        emailError.classList.remove('hidden');
        userEmailInput.focus();
        return;
    }

    emailError.classList.add('hidden');

    // Hide modal and trigger download (no server tracking for now)
    hideEmailModal();
    downloadCSV();
}

// Modal event listeners
modalClose.addEventListener('click', hideEmailModal);
modalCancel.addEventListener('click', hideEmailModal);
modalSubmit.addEventListener('click', handleEmailSubmit);

// Close modal on overlay click
emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) {
        hideEmailModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !emailModal.classList.contains('hidden')) {
        hideEmailModal();
    }
});

// Submit on Enter key in email input
userEmailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleEmailSubmit();
    }
});
