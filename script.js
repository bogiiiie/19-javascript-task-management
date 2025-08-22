// Global variables
let currentFilter = 'all';
let taskIdCounter = 1;
let editingTaskId = null;
let tasks = {};

// Notification system variables
let activeNotificationTimeout = null;
let notificationQueue = [];
let isShowingNotification = false;

// Action debouncing variables
let lastActionTime = 0;
const ACTION_COOLDOWN = 300;

// Local Storage keys
const STORAGE_KEY = 'taskly_tasks';
const COUNTER_KEY = 'taskly_counter';

// Initialize application - IMPROVED
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set current year in footer
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Load tasks from localStorage
    loadTasksFromStorage();
    
    // Set up ALL event listeners (no more onclick attributes needed)
    setupEventListeners();
    
    // Render initial tasks
    renderTasks();
    
    // Set initial filter
    updateActiveFilter('all');
}

function setupEventListeners() {
    // Add task button - FIXED
    const addTaskButton = document.getElementById('add-task-button');
    if (addTaskButton) {
        addTaskButton.removeAttribute('onclick'); // Remove any existing onclick
        addTaskButton.addEventListener('click', displayAddTaskModal);
    }
    
    // Task form submission
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskFormSubmit);
    }
    
    // Cancel button - FIXED
    const cancelButton = document.getElementById('cancel-button');
    if (cancelButton) {
        cancelButton.removeAttribute('onclick'); // Remove any existing onclick
        cancelButton.addEventListener('click', removeAddTaskModal);
    }
    
    // Filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const filter = e.target.getAttribute('data-filter');
            setActiveFilter(filter);
        });
    });
    
    // Modal overlay click to close
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                removeAddTaskModal();
            }
        });
    }
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            removeAddTaskModal();
        }
    });
}

// IMPROVED NOTIFICATION SYSTEM WITH FONTAWESOME ICONS
function showNotification(message, type = 'success') {
    // Clear any existing timeout
    if (activeNotificationTimeout) {
        clearTimeout(activeNotificationTimeout);
        activeNotificationTimeout = null;
    }
    
    // Remove ALL existing notifications immediately
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    // Reset the showing flag
    isShowingNotification = false;
    
    // If we're currently showing a notification, add to queue
    if (isShowingNotification) {
        // Replace any existing queued notification of the same type with the new one
        notificationQueue = notificationQueue.filter(item => item.type !== type);
        notificationQueue.push({ message, type });
        return;
    }
    
    // Mark that we're showing a notification
    isShowingNotification = true;
    
    // Create notification container
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Base professional styling
    const baseStyle = `
        position: fixed;
        top: 80px;
        left: 20px;
        width: auto;
        padding: 16px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        border: 1.5px solid;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(100px);
        word-wrap: break-word;
    `;
    
    // Create FontAwesome icon
    const icon = document.createElement('i');
    icon.style.cssText = 'flex-shrink: 0; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 16px;';
    icon.setAttribute('aria-hidden', 'true');
    
    // Create message
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = 'flex: 1; margin: 0;';
    
    // Type-specific styling and FontAwesome icons
    if (type === 'success') {
        notification.style.cssText = baseStyle + `
            background-color: #f0fdf4;
            border-color: #bbf7d0;
            color: #166534;
        `;
        icon.className = 'fa fa-check-circle';
        icon.style.color = '#16a34a';
    } else if (type === 'error') {
        notification.style.cssText = baseStyle + `
            background-color: #fef2f2;
            border-color: #fca5a5;
            color: #991b1b;
        `;
        icon.className = 'fa fa-times-circle';
        icon.style.color = '#dc2626';
    } else if (type === 'warning') {
        notification.style.cssText = baseStyle + `
            background-color: #fffbeb;
            border-color: #fed7aa;
            color: #92400e;
        `;
        icon.className = 'fa fa-exclamation-triangle';
        icon.style.color = '#f59e0b';
    } else {
        // info type
        notification.style.cssText = baseStyle + `
            background-color: #eff6ff;
            border-color: #bfdbfe;
            color: #1e40af;
        `;
        icon.className = 'fa fa-info-circle';
        icon.style.color = '#2563eb';
    }
    
    // Assemble notification
    notification.appendChild(icon);
    notification.appendChild(messageEl);
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });
    
    // Auto remove with improved cleanup
    activeNotificationTimeout = setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';
            
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.remove();
                }
                
                // Reset flag and process queue
                isShowingNotification = false;
                activeNotificationTimeout = null;
                
                // Process next notification in queue
                if (notificationQueue.length > 0) {
                    const next = notificationQueue.shift();
                    setTimeout(() => {
                        showNotification(next.message, next.type);
                    }, 100);
                }
            }, 300);
        }
    }, 2000);
}

// DEBOUNCING SYSTEM - PREVENTS SPAM
function debounceAction(callback, ...args) {
    const now = Date.now();
    if (now - lastActionTime < ACTION_COOLDOWN) {
        return false; // Skip if too soon
    }
    lastActionTime = now;
    callback(...args);
    return true;
}

// Modal functions - FIXED
function displayAddTaskModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('add-task-modal');
    const modalTitle = document.getElementById('modal-title');
    
    if (!modalOverlay || !modalTitle) {
        console.error('Modal elements not found');
        return;
    }
    
    // Reset form
    resetTaskForm();
    
    // Set modal title
    modalTitle.textContent = editingTaskId ? 'Edit Task' : 'Add New Task';
    
    // If editing, populate form with existing data
    if (editingTaskId && tasks[editingTaskId]) {
        populateFormForEdit(tasks[editingTaskId]);
    }
    
    // Show modal
    modalOverlay.classList.remove('hidden');
    modalOverlay.classList.add('flex');
    
    // Focus on task name input
    const taskNameInput = document.getElementById('task-name-input');
    if (taskNameInput) {
        setTimeout(() => taskNameInput.focus(), 100);
    }
}

function removeAddTaskModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;
    
    modalOverlay.classList.add('hidden');
    modalOverlay.classList.remove('flex');
    
    // Reset editing state
    editingTaskId = null;
    resetTaskForm();
}

// Rest of your original functions with debouncing added to critical actions...
function loadTasksFromStorage() {
    try {
        const storedTasks = localStorage.getItem(STORAGE_KEY);
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        } else {
            saveTasksToStorage();
        }
        
        const storedCounter = localStorage.getItem(COUNTER_KEY);
        if (storedCounter) {
            taskIdCounter = parseInt(storedCounter);
        } else {
            const taskIds = Object.keys(tasks).map(id => parseInt(id));
            taskIdCounter = taskIds.length > 0 ? Math.max(...taskIds) + 1 : 1;
            saveCounterToStorage();
        }
    } catch (error) {
        console.error('Error loading tasks from localStorage:', error);
    }
}

function saveTasksToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks to localStorage:', error);
        showNotification('Unable to save tasks. Storage may be full.', 'error');
    }
}

function saveCounterToStorage() {
    try {
        localStorage.setItem(COUNTER_KEY, taskIdCounter.toString());
    } catch (error) {
        console.error('Error saving counter to localStorage:', error);
    }
}

function resetTaskForm() {
    const form = document.getElementById('task-form');
    if (form) {
        form.reset();
    }
    
    const inputs = form ? form.querySelectorAll('input') : [];
    inputs.forEach(input => {
        input.classList.remove('border-red-500');
        input.setAttribute('aria-invalid', 'false');
    });
}

function populateFormForEdit(task) {
    const taskNameInput = document.getElementById('task-name-input');
    const dueDateInput = document.getElementById('due-date-input');
    
    if (taskNameInput) taskNameInput.value = task.title;
    if (dueDateInput) dueDateInput.value = task.dueDate || '';
}

function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const taskNameInput = document.getElementById('task-name-input');
    const dueDateInput = document.getElementById('due-date-input');
    
    if (!validateTaskForm(taskNameInput, dueDateInput)) {
        return;
    }
    
    const taskData = {
        title: taskNameInput.value.trim(),
        dueDate: dueDateInput.value || null
    };
    
    if (editingTaskId) {
        updateTask(editingTaskId, taskData);
        showNotification('Task updated successfully!', 'success');
    } else {
        createTask(taskData);
        showNotification('Task created successfully!', 'success');
    }
    
    removeAddTaskModal();
    renderTasks();
}

function validateTaskForm(taskNameInput, dueDateInput) {
    let isValid = true;
    
    if (!taskNameInput.value.trim()) {
        taskNameInput.classList.add('border-red-500');
        taskNameInput.setAttribute('aria-invalid', 'true');
        taskNameInput.focus();
        showNotification('Please enter a task name', 'error');
        isValid = false;
    } else {
        taskNameInput.classList.remove('border-red-500');
        taskNameInput.setAttribute('aria-invalid', 'false');
    }
    
    if (dueDateInput.value) {
        const selectedDate = new Date(dueDateInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            dueDateInput.classList.add('border-red-500');
            dueDateInput.setAttribute('aria-invalid', 'true');
            showNotification('Due date cannot be in the past', 'error');
            isValid = false;
        } else {
            dueDateInput.classList.remove('border-red-500');
            dueDateInput.setAttribute('aria-invalid', 'false');
        }
    }
    
    return isValid;
}

// DEBOUNCED TASK ACTIONS
function createTask(taskData) {
    const newTask = {
        id: taskIdCounter++,
        title: taskData.title,
        dueDate: taskData.dueDate,
        status: 'active',
        createdAt: new Date().toISOString()
    };
    
    tasks[newTask.id] = newTask;
    saveTasksToStorage();
    saveCounterToStorage();
}

function updateTask(taskId, taskData) {
    if (tasks[taskId]) {
        tasks[taskId].title = taskData.title;
        tasks[taskId].dueDate = taskData.dueDate;
        tasks[taskId].updatedAt = new Date().toISOString();
        saveTasksToStorage();
    }
}

function deleteTask(taskId) {
    if (!debounceAction(() => {
        if (tasks[taskId]) {
            delete tasks[taskId];
            saveTasksToStorage();
            renderTasks();
            showNotification('Task deleted successfully!', 'success');
        }
    })) {
        return; // Action was debounced
    }
}

function toggleTaskStatus(taskId) {
    if (!debounceAction(() => {
        if (tasks[taskId]) {
            tasks[taskId].status = tasks[taskId].status === 'active' ? 'completed' : 'active';
            tasks[taskId].updatedAt = new Date().toISOString();
            saveTasksToStorage();
            renderTasks();
            
            const statusText = tasks[taskId].status === 'completed' ? 'completed' : 'marked as active';
            showNotification(`Task ${statusText}!`, 'success');
        }
    })) {
        return; // Action was debounced
    }
}

function editTask(taskId) {
    editingTaskId = taskId;
    displayAddTaskModal();
}

// Rest of the functions remain the same...
function renderTasks() {
    const taskListContainer = document.getElementById('task-list-container');
    const emptyState = document.getElementById('empty-state');
    
    if (!taskListContainer) return;
    
    taskListContainer.innerHTML = '';
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
        return;
    }
    
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskListContainer.appendChild(taskElement);
    });
}

function getFilteredTasks() {
    const taskList = Object.values(tasks);
    
    switch (currentFilter) {
        case 'active':
            return taskList.filter(task => task.status === 'active');
        case 'completed':
            return taskList.filter(task => task.status === 'completed');
        case 'all':
        default:
            return taskList;
    }
}

function createTaskElement(task) {
    const article = document.createElement('article');
    article.id = `task-item-${task.id}`;
    article.className = `task-item task-item--${task.status} w-full flex justify-between items-center gap-4 bg-white p-4 border border-gray-200 rounded-xl shadow-xs hover:shadow-lg transition`;
    article.setAttribute('role', 'listitem');
    article.setAttribute('data-task-id', task.id);
    article.setAttribute('data-task-status', task.status);
    article.setAttribute('aria-labelledby', `task-${task.id}-title`);
    article.setAttribute('aria-describedby', `task-${task.id}-details`);
    
    const formattedDate = formatDueDate(task.dueDate);
    const isToday = isDateToday(task.dueDate);
    const dateClass = isToday ? 'text-orange-600 font-medium' : 'text-gray-500';
    
    article.innerHTML = `
        <div class="task-checkbox-wrapper">
            <input type="checkbox" id="task-${task.id}-checkbox" 
                class="task-checkbox text-blue-500 w-5 h-5 focus-visible" 
                ${task.status === 'completed' ? 'checked' : ''}
                aria-describedby="task-${task.id}-title task-${task.id}-details" 
                aria-label="${task.status === 'completed' ? 'Mark task as incomplete' : 'Mark task as complete'}">
        </div>

        <div class="task-content flex-1">
            <h3 id="task-${task.id}-title" class="task-title text-gray-900 text-lg ${task.status === 'completed' ? 'line-through text-gray-500' : ''}">${escapeHtml(task.title)}</h3>
            <p id="task-${task.id}-details" class="task-details text-sm ${task.status === 'completed' ? 'text-gray-400' : dateClass}">
                <span class="task-due-label">Due: </span>
                <time datetime="${task.dueDate || ''}" class="task-due-date">${formattedDate}</time>
            </p>
        </div>

        <div class="task-actions flex justify-center items-center gap-1" role="group"
            aria-label="Task actions for ${escapeHtml(task.title)}">
            <button
                class="task-action-button task-edit-button text-gray-400 rounded-lg p-2 hover:bg-blue-100 hover:text-blue-600 active:bg-blue-100 active:text-blue-600 transition cursor-pointer focus-visible"
                type="button" aria-label="Edit ${escapeHtml(task.title)} task" data-task-id="${task.id}">
                <i class="fa fa-pencil" aria-hidden="true"></i>
            </button>
            <button
                class="task-action-button task-delete-button text-gray-400 rounded-lg p-2 hover:bg-red-100 hover:text-red-600 active:bg-red-100 active:text-red-600 transition cursor-pointer focus-visible"
                type="button" aria-label="Delete ${escapeHtml(task.title)} task" data-task-id="${task.id}">
                <i class="fa fa-trash" aria-hidden="true"></i>
            </button>
        </div>
    `;
    
    // Add event listeners directly (no more onclick attributes)
    const checkbox = article.querySelector('.task-checkbox');
    const editButton = article.querySelector('.task-edit-button');
    const deleteButton = article.querySelector('.task-delete-button');
    
    if (checkbox) {
        checkbox.addEventListener('change', () => toggleTaskStatus(task.id));
    }
    
    if (editButton) {
        editButton.addEventListener('click', () => editTask(task.id));
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => deleteTask(task.id));
    }
    
    return article;
}

function setActiveFilter(filter) {
    currentFilter = filter;
    updateActiveFilter(filter);
    renderTasks();
}

function updateActiveFilter(filter) {
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => {
        const tabFilter = tab.getAttribute('data-filter');
        const isActive = tabFilter === filter;
        
        if (isActive) {
            tab.classList.add('filter-tab--active', 'text-blue-600', 'bg-white', 'shadow-sm');
            tab.classList.remove('text-gray-600');
        } else {
            tab.classList.remove('filter-tab--active', 'text-blue-600', 'bg-white', 'shadow-sm');
            tab.classList.add('text-gray-600');
        }
        
        tab.setAttribute('aria-selected', isActive.toString());
    });
}

function formatDueDate(dateString) {
    if (!dateString) return 'No Date';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedDate = normalizeDate(date);
    const normalizedToday = normalizeDate(today);
    const normalizedTomorrow = normalizeDate(tomorrow);
    
    if (normalizedDate.getTime() === normalizedToday.getTime()) {
        return 'Today';
    } else if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

function isDateToday(dateString) {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility functions
function getTotalTasks() {
    return Object.keys(tasks).length;
}

function getActiveTasks() {
    return Object.values(tasks).filter(task => task.status === 'active').length;
}

function getCompletedTasks() {
    return Object.values(tasks).filter(task => task.status === 'completed').length;
}

function clearAllTasks() {
    tasks = {};
    saveTasksToStorage();
    renderTasks();
    showNotification('All tasks deleted!', 'success');
}

function clearCompletedTasks() {
    const completedTasks = Object.values(tasks).filter(task => task.status === 'completed');
    
    if (completedTasks.length === 0) {
        showNotification('No completed tasks to clear', 'error');
        return;
    }
    
    completedTasks.forEach(task => {
        delete tasks[task.id];
    });
    
    saveTasksToStorage();
    renderTasks();
    showNotification(`${completedTasks.length} completed task(s) deleted!`, 'success');
}

function exportTasks() {
    const dataStr = JSON.stringify({ tasks, counter: taskIdCounter }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `taskly-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Tasks exported successfully!', 'success');
}

function importTasks(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.tasks && typeof data.tasks === 'object') {
                tasks = data.tasks;
                taskIdCounter = data.counter || Object.keys(tasks).length + 1;
                saveTasksToStorage();
                saveCounterToStorage();
                renderTasks();
                showNotification('Tasks imported successfully!', 'success');
            } else {
                showNotification('Invalid backup file format', 'error');
            }
        } catch (error) {
            showNotification('Error reading backup file', 'error');
        }
    };
    reader.readAsText(file);
}

// Export functions for external use
window.TasklyApp = {
    getTotalTasks,
    getActiveTasks,
    getCompletedTasks,
    clearAllTasks,
    clearCompletedTasks,
    exportTasks,
    importTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    setActiveFilter
};