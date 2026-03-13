with open('app.js', 'r') as f:
    content = f.read()

toast_func = """
function showToast(message, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? '#10b981' : '#3b82f6';
    toast.style.color = '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.fontSize = '0.9em';
    toast.style.fontWeight = '600';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-spinner fa-spin';
    toast.appendChild(icon);

    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (toast.parentElement) toast.parentElement.removeChild(toast);
        }, 300);
    }, 3000);
}
"""

# Insert before Global Storage Strategy
content = content.replace("// Global Storage Strategy", toast_func + "\n// Global Storage Strategy")

# Modify saveToLocalStorage to trigger the toast
save_storage_search = """// Global Storage Strategy
function saveToLocalStorage() {
    const data = {
        buildings: allBuildings,
        companies: companies
    };
    localStorage.setItem('VestaLogic_Storage', JSON.stringify(data));
}"""

save_storage_replace = """// Global Storage Strategy
function saveToLocalStorage() {
    showToast('Saving...', 'info');
    const data = {
        buildings: allBuildings,
        companies: companies
    };
    localStorage.setItem('VestaLogic_Storage', JSON.stringify(data));
    setTimeout(() => {
        showToast('VestaLogic ledger updated', 'success');
    }, 500); // slight delay to show the sequence
}"""

content = content.replace(save_storage_search, save_storage_replace)

with open('app.js', 'w') as f:
    f.write(content)
