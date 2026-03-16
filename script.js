// Global variables
let fileContent = null;
let processedResults = null;
let totalNumbers = 0;
let validNumbers = 0;
let invalidNumbers = 0;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    setupFileInput();
});

// Setup drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// Setup file input
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
}

// Handle file selection
function handleFile(file) {
    // Validate file
    if (!file.name.endsWith('.txt')) {
        alert('Please select a .txt file');
        return;
    }
    
    // Update file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').classList.remove('d-none');
    
    // Enable process button
    document.getElementById('processBtn').disabled = false;
    
    // Read file content
    const reader = new FileReader();
    reader.onload = function(e) {
        fileContent = e.target.result;
    };
    reader.readAsText(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Main processing function
function processFile() {
    if (!fileContent) {
        alert('Please select a file first');
        return;
    }
    
    // Reset results
    resetResults();
    
    // Show progress bar
    document.getElementById('progressContainer').classList.remove('d-none');
    
    // Get user options
    const removePlusOne = document.getElementById('removePlusOne').checked;
    const filterInvalid = document.getElementById('filterInvalid').checked;
    
    // Split content into lines
    const lines = fileContent.split('\n');
    totalNumbers = lines.length;
    
    // Process in chunks to prevent blocking
    processInChunks(lines, removePlusOne, filterInvalid);
}

// Process numbers in chunks for better performance
function processInChunks(lines, removePlusOne, filterInvalid) {
    const chunkSize = 1000;
    let currentIndex = 0;
    processedResults = {
        valid: [],
        invalid: [],
        byState: {}
    };
    
    function processChunk() {
        const endIndex = Math.min(currentIndex + chunkSize, totalNumbers);
        
        for (let i = currentIndex; i < endIndex; i++) {
            const line = lines[i].trim();
            if (line) {
                processPhoneNumber(line, removePlusOne, filterInvalid);
            }
            
            // Update progress
            const progress = ((i + 1) / totalNumbers) * 100;
            updateProgress(progress);
        }
        
        currentIndex += chunkSize;
        
        if (currentIndex < totalNumbers) {
            // Process next chunk
            setTimeout(processChunk, 10);
        } else {
            // Processing complete
            finishProcessing();
        }
    }
    
    // Start processing
    processChunk();
}

// Process individual phone number
function processPhoneNumber(number, removePlusOne, filterInvalid) {
    // Clean the number
    let cleaned = number;
    
    // Remove +1 if option is checked
    if (removePlusOne) {
        cleaned = cleaned.replace(/^\+1/, '').replace(/^1/, '');
    }
    
    // Remove all non-digits
    cleaned = cleaned.replace(/\D/g, '');
    
    // Check if it's 10 digits
    if (cleaned.length === 10) {
        const areaCode = cleaned.substring(0, 3);
        
        // Check if valid area code
        if (isValidAreaCode(areaCode)) {
            const state = getStateFromAreaCode(areaCode);
            
            // Format: (XXX) XXX-XXXX
            const formatted = `(${areaCode}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
            
            const result = {
                original: number,
                cleaned: cleaned,
                formatted: formatted,
                areaCode: areaCode,
                state: state,
                status: 'valid'
            };
            
            // Add to results
            processedResults.valid.push(result);
            validNumbers++;
            
            // Add to state grouping
            if (!processedResults.byState[state]) {
                processedResults.byState[state] = [];
            }
            processedResults.byState[state].push(result);
            
        } else {
            // Invalid area code
            processedResults.invalid.push({
                original: number,
                cleaned: cleaned,
                error: 'Invalid area code',
                status: 'invalid'
            });
            invalidNumbers++;
        }
    } else {
        // Invalid length
        processedResults.invalid.push({
            original: number,
            cleaned: cleaned,
            error: `Invalid length: ${cleaned.length} digits`,
            status: 'invalid'
        });
        invalidNumbers++;
    }
}

// Update progress bar
function updateProgress(percentage) {
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${Math.round(percentage)}%`;
}

// Finish processing and display results
function finishProcessing() {
    // Hide progress bar
    setTimeout(() => {
        document.getElementById('progressContainer').classList.add('d-none');
    }, 500);
    
    // Update counts
    document.getElementById('totalCount').textContent = totalNumbers;
    document.getElementById('validCount').textContent = validNumbers;
    document.getElementById('invalidCount').textContent = invalidNumbers;
    document.getElementById('statesCount').textContent = Object.keys(processedResults.byState).length;
    
    // Display states distribution
    displayStatesDistribution();
    
    // Create download buttons
    createDownloadButtons();
    
    // Populate results table
    populateResultsTable();
    
    // Show results section
    document.getElementById('resultsSection').classList.remove('d-none');
    
    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

// Display states distribution
function displayStatesDistribution() {
    const statesList = document.getElementById('statesList');
    statesList.innerHTML = '';
    
    const states = Object.entries(processedResults.byState)
        .sort((a, b) => b[1].length - a[1].length);
    
    states.forEach(([state, numbers]) => {
        const stateDiv = document.createElement('div');
        stateDiv.className = 'state-card card mb-2';
        stateDiv.innerHTML = `
            <div class="card-body py-2">
                <div class="row align-items-center">
                    <div class="col-md-3">
                        <span class="badge bg-primary">${state}</span>
                    </div>
                    <div class="col-md-6">
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" 
                                 style="width: ${(numbers.length / validNumbers) * 100}%">
                                ${numbers.length} numbers
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3 text-end">
                        <span class="badge bg-secondary">${((numbers.length / validNumbers) * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
        statesList.appendChild(stateDiv);
    });
}

// Create download buttons
function createDownloadButtons() {
    const downloadButtons = document.getElementById('downloadButtons');
    downloadButtons.innerHTML = '';
    
    // All valid numbers
    const allValidBtn = document.createElement('button');
    allValidBtn.className = 'btn btn-success btn-sm me-2 mb-2';
    allValidBtn.innerHTML = '<i class="fas fa-download me-1"></i>All Valid Numbers';
    allValidBtn.onclick = () => downloadAllValidNumbers();
    downloadButtons.appendChild(allValidBtn);
    
    // Create buttons for each state
    Object.keys(processedResults.byState).forEach(state => {
        const stateBtn = document.createElement('button');
        stateBtn.className = 'btn btn-outline-primary btn-sm me-2 mb-2';
        stateBtn.innerHTML = `<i class="fas fa-download me-1"></i>${state}`;
        stateBtn.onclick = () => downloadStateNumbers(state);
        downloadButtons.appendChild(stateBtn);
    });
    
    // Invalid numbers
    if (processedResults.invalid.length > 0) {
        const invalidBtn = document.createElement('button');
        invalidBtn.className = 'btn btn-danger btn-sm me-2 mb-2';
        invalidBtn.innerHTML = `<i class="fas fa-download me-1"></i>Invalid Numbers (${processedResults.invalid.length})`;
        invalidBtn.onclick = () => downloadInvalidNumbers();
        downloadButtons.appendChild(invalidBtn);
    }
}

// Populate results table
function populateResultsTable() {
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';
    
    // Show first 100 valid numbers in table
    const displayNumbers = processedResults.valid.slice(0, 100);
    
    displayNumbers.forEach((number, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><small>${number.original}</small></td>
            <td><strong>${number.cleaned}</strong></td>
            <td>${number.formatted}</td>
            <td><span class="badge bg-info">${number.areaCode}</span></td>
            <td><span class="badge bg-primary">${number.state}</span></td>
            <td><span class="badge bg-success">Valid</span></td>
        `;
        resultsBody.appendChild(row);
    });
    
    // Show message if more numbers exist
    if (processedResults.valid.length > 100) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="text-center text-muted">
                ... and ${processedResults.valid.length - 100} more valid numbers
            </td>
        `;
        resultsBody.appendChild(row);
    }
}

// Download functions
function downloadAllValidNumbers() {
    const content = processedResults.valid.map(n => n.formatted).join('\n');
    downloadFile('all-valid-numbers.txt', content);
}

function downloadStateNumbers(state) {
    const stateNumbers = processedResults.byState[state];
    const content = stateNumbers.map(n => n.formatted).join('\n');
    const filename = state.toLowerCase().replace(/\s+/g, '-') + '-numbers.txt';
    downloadFile(filename, content);
}

function downloadInvalidNumbers() {
    const content = processedResults.invalid.map(n => `${n.original} - ${n.error}`).join('\n');
    downloadFile('invalid-numbers.txt', content);
}

async function downloadAllAsZip() {
    const zip = new JSZip();
    
    // Add all valid numbers
    const allValid = processedResults.valid.map(n => n.formatted).join('\n');
    zip.file("all-valid-numbers.txt", allValid);
    
    // Add each state file
    Object.entries(processedResults.byState).forEach(([state, numbers]) => {
        const content = numbers.map(n => n.formatted).join('\n');
        const filename = `states/${state.toLowerCase().replace(/\s+/g, '-')}.txt`;
        zip.file(filename, content);
    });
    
    // Add invalid numbers
    if (processedResults.invalid.length > 0) {
        const invalidContent = processedResults.invalid.map(n => `${n.original} - ${n.error}`).join('\n');
        zip.file("invalid-numbers.txt", invalidContent);
    }
    
    // Generate and download zip
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "phone-numbers-results.zip");
}

// Helper function to download file
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Reset results
function resetResults() {
    processedResults = null;
    totalNumbers = 0;
    validNumbers = 0;
    invalidNumbers = 0;
    
    // Reset UI
    document.getElementById('totalCount').textContent = '0';
    document.getElementById('validCount').textContent = '0';
    document.getElementById('invalidCount').textContent = '0';
    document.getElementById('statesCount').textContent = '0';
    
    // Hide results section
    document.getElementById('resultsSection').classList.add('d-none');
}

// Utility functions (using data from states-data.js)
function getStateFromAreaCode(areaCode) {
    for (const [state, codes] of Object.entries(USA_STATES_AREA_CODES)) {
        if (codes.includes(areaCode)) {
            return state;
        }
    }
    return 'Unknown';
}

function isValidAreaCode(areaCode) {
    return ALL_AREA_CODES.has(areaCode);
}
