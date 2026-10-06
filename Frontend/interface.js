
const toast = document.getElementById('toast');
let toastTimer;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
        const section = link.dataset.section;
        document.getElementById('breadcrumb').textContent = section;
        if (section !== 'Vue d’ensemble') showToast(`Vue « ${section} » sélectionnée`);
    });
});

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const scheduleItems = [...document.querySelectorAll('.schedule-item')];
function filterSchedule() {
    const query = searchInput.value.trim().toLocaleLowerCase('fr');
    const status = statusFilter.value;
    let visibleCount = 0;
    scheduleItems.forEach((item) => {
        const matches = item.dataset.name.includes(query) && (status === 'all' || item.dataset.status === status);
        item.hidden = !matches;
        if (matches) visibleCount += 1;
    });
    document.getElementById('emptyState').style.display = visibleCount ? 'none' : 'block';
}
searchInput.addEventListener('input', filterSchedule);
statusFilter.addEventListener('change', filterSchedule);

const modalBackdrop = document.getElementById('modalBackdrop');
const openModal = () => { modalBackdrop.classList.add('open'); document.getElementById('beneficiary').focus(); };
const closeModal = () => modalBackdrop.classList.remove('open');
document.getElementById('openModal').addEventListener('click', openModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
document.getElementById('interventionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const beneficiary = document.getElementById('beneficiary').value;
    showToast(`Intervention planifiée pour ${beneficiary} (démo)`);
    event.currentTarget.reset();
    closeModal();
});

const notificationButton = document.getElementById('notificationButton');
const notificationPop = document.getElementById('notificationPop');
notificationButton.addEventListener('click', () => notificationPop.classList.toggle('open'));
document.addEventListener('click', (event) => {
    if (!notificationButton.contains(event.target) && !notificationPop.contains(event.target)) notificationPop.classList.remove('open');
});

const date = new Date();
const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
document.getElementById('interventionDate').value = localDate;
const formatDate = (value, options) => new Intl.DateTimeFormat('fr-FR', options).format(value);
function updateDate() {
    document.getElementById('dayLabel').textContent = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('fullDate').textContent = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
document.getElementById('previousDay').addEventListener('click', () => { date.setDate(date.getDate() - 1); updateDate(); });
document.getElementById('nextDay').addEventListener('click', () => { date.setDate(date.getDate() + 1); updateDate(); });
document.querySelectorAll('.view-switch button').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.view-switch button').forEach((item) => item.classList.remove('selected'));
        button.classList.add('selected');
        showToast(`Affichage ${button.dataset.view.toLowerCase()} sélectionné`);
    });
});
document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => showToast(button.dataset.action === 'replacement' ? 'Recherche de remplaçants ouverte (démo)' : 'Compte rendu ouvert (démo)'));
});
document.getElementById('seePlanning').addEventListener('click', () => showToast('Planning complet ouvert (démo)'));
document.getElementById('helpLink').addEventListener('click', (event) => { event.preventDefault(); showToast('Centre d’aide (démo)'); });
updateDate();
