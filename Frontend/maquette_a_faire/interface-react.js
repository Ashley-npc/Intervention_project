/* Load React 18 and ReactDOM 18 before this file, then use it instead of interface.js. */
(() => {
    if (!window.React || !window.ReactDOM) {
        throw new Error('interface-react.js requires React and ReactDOM to be loaded first.');
    }

    const { createElement, useEffect, useState } = React;
    const h = createElement;

    function InterfaceController() {
        const [section, setSection] = useState('Vue d’ensemble');
        const [query, setQuery] = useState('');
        const [status, setStatus] = useState('all');
        const [modalOpen, setModalOpen] = useState(false);
        const [notificationsOpen, setNotificationsOpen] = useState(false);
        const [selectedView, setSelectedView] = useState('Jour');
        const [date, setDate] = useState(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        });
        const [toastMessage, setToastMessage] = useState('');

        useEffect(() => {
            const timer = toastMessage
                ? window.setTimeout(() => setToastMessage(''), 2800)
                : undefined;
            const toast = document.getElementById('toast');
            if (toast) {
                toast.textContent = toastMessage;
                toast.classList.toggle('show', Boolean(toastMessage));
            }
            return () => window.clearTimeout(timer);
        }, [toastMessage]);

        useEffect(() => {
            const links = [...document.querySelectorAll('.nav-link')];
            const handleClick = (event) => {
                const nextSection = event.currentTarget.dataset.section;
                setSection(nextSection);
                if (nextSection !== 'Vue d’ensemble') {
                    setToastMessage(`Vue « ${nextSection} » sélectionnée`);
                }
            };
            links.forEach((link) => link.addEventListener('click', handleClick));
            return () => links.forEach((link) => link.removeEventListener('click', handleClick));
        }, []);

        useEffect(() => {
            document.querySelectorAll('.nav-link').forEach((link) => {
                link.classList.toggle('active', link.dataset.section === section);
            });
            const breadcrumb = document.getElementById('breadcrumb');
            if (breadcrumb) breadcrumb.textContent = section;
        }, [section]);

        useEffect(() => {
            const input = document.getElementById('searchInput');
            const filter = document.getElementById('statusFilter');
            if (input && input.value !== query) input.value = query;
            if (filter && filter.value !== status) filter.value = status;

            const normalizedQuery = query.trim().toLocaleLowerCase('fr');
            const items = [...document.querySelectorAll('.schedule-item')];
            let visibleCount = 0;
            items.forEach((item) => {
                const matches = item.dataset.name.includes(normalizedQuery)
                    && (status === 'all' || item.dataset.status === status);
                item.hidden = !matches;
                if (matches) visibleCount += 1;
            });
            const emptyState = document.getElementById('emptyState');
            if (emptyState) emptyState.style.display = visibleCount ? 'none' : 'block';

            const handleSearch = (event) => setQuery(event.currentTarget.value);
            const handleStatus = (event) => setStatus(event.currentTarget.value);
            input?.addEventListener('input', handleSearch);
            filter?.addEventListener('change', handleStatus);
            return () => {
                input?.removeEventListener('input', handleSearch);
                filter?.removeEventListener('change', handleStatus);
            };
        }, [query, status]);

        useEffect(() => {
            const backdrop = document.getElementById('modalBackdrop');
            const openButton = document.getElementById('openModal');
            const closeButton = document.getElementById('closeModal');
            const cancelButton = document.getElementById('cancelModal');
            const form = document.getElementById('interventionForm');
            const dateInput = document.getElementById('interventionDate');
            if (!backdrop) return undefined;

            backdrop.classList.toggle('open', modalOpen);
            if (dateInput && !dateInput.value) {
                const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 10);
                dateInput.value = localDate;
            }
            if (modalOpen) document.getElementById('beneficiary')?.focus();

            const open = () => setModalOpen(true);
            const close = () => setModalOpen(false);
            const handleBackdropClick = (event) => {
                if (event.target === backdrop) close();
            };
            const handleKeyDown = (event) => {
                if (event.key === 'Escape') close();
            };
            const handleSubmit = (event) => {
                event.preventDefault();
                const beneficiary = document.getElementById('beneficiary')?.value;
                setToastMessage(`Intervention planifiée pour ${beneficiary} (démo)`);
                form?.reset();
                close();
            };

            openButton?.addEventListener('click', open);
            closeButton?.addEventListener('click', close);
            cancelButton?.addEventListener('click', close);
            backdrop.addEventListener('click', handleBackdropClick);
            document.addEventListener('keydown', handleKeyDown);
            form?.addEventListener('submit', handleSubmit);
            return () => {
                openButton?.removeEventListener('click', open);
                closeButton?.removeEventListener('click', close);
                cancelButton?.removeEventListener('click', close);
                backdrop.removeEventListener('click', handleBackdropClick);
                document.removeEventListener('keydown', handleKeyDown);
                form?.removeEventListener('submit', handleSubmit);
            };
        }, [modalOpen]);

        useEffect(() => {
            const button = document.getElementById('notificationButton');
            const popover = document.getElementById('notificationPop');
            if (!button || !popover) return undefined;

            popover.classList.toggle('open', notificationsOpen);
            const toggle = () => setNotificationsOpen((isOpen) => !isOpen);
            const dismissOutside = (event) => {
                if (!button.contains(event.target) && !popover.contains(event.target)) {
                    setNotificationsOpen(false);
                }
            };
            button.addEventListener('click', toggle);
            document.addEventListener('click', dismissOutside);
            return () => {
                button.removeEventListener('click', toggle);
                document.removeEventListener('click', dismissOutside);
            };
        }, [notificationsOpen]);

        useEffect(() => {
            const formatDate = (value, options) => new Intl.DateTimeFormat('fr-FR', options).format(value);
            const dayLabel = document.getElementById('dayLabel');
            const fullDate = document.getElementById('fullDate');
            if (dayLabel) dayLabel.textContent = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
            if (fullDate) fullDate.textContent = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            const shiftDate = (amount) => {
                setDate((currentDate) => {
                    const nextDate = new Date(currentDate);
                    nextDate.setDate(nextDate.getDate() + amount);
                    return nextDate;
                });
            };
            const previous = document.getElementById('previousDay');
            const next = document.getElementById('nextDay');
            const onPrevious = () => shiftDate(-1);
            const onNext = () => shiftDate(1);
            previous?.addEventListener('click', onPrevious);
            next?.addEventListener('click', onNext);
            return () => {
                previous?.removeEventListener('click', onPrevious);
                next?.removeEventListener('click', onNext);
            };
        }, [date]);

        useEffect(() => {
            const buttons = [...document.querySelectorAll('.view-switch button')];
            buttons.forEach((button) => {
                button.classList.toggle('selected', button.dataset.view === selectedView);
            });
            const handleClick = (event) => {
                const view = event.currentTarget.dataset.view;
                setSelectedView(view);
                setToastMessage(`Affichage ${view.toLowerCase()} sélectionné`);
            };
            buttons.forEach((button) => button.addEventListener('click', handleClick));
            return () => buttons.forEach((button) => button.removeEventListener('click', handleClick));
        }, [selectedView]);

        useEffect(() => {
            const actionButtons = [...document.querySelectorAll('[data-action]')];
            const planningButton = document.getElementById('seePlanning');
            const helpLink = document.getElementById('helpLink');
            const handleAction = (event) => {
                setToastMessage(event.currentTarget.dataset.action === 'replacement'
                    ? 'Recherche de remplaçants ouverte (démo)'
                    : 'Compte rendu ouvert (démo)');
            };
            const handlePlanning = () => setToastMessage('Planning complet ouvert (démo)');
            const handleHelp = (event) => {
                event.preventDefault();
                setToastMessage('Centre d’aide (démo)');
            };
            actionButtons.forEach((button) => button.addEventListener('click', handleAction));
            planningButton?.addEventListener('click', handlePlanning);
            helpLink?.addEventListener('click', handleHelp);
            return () => {
                actionButtons.forEach((button) => button.removeEventListener('click', handleAction));
                planningButton?.removeEventListener('click', handlePlanning);
                helpLink?.removeEventListener('click', handleHelp);
            };
        }, []);

        return h('span', { hidden: true, 'aria-hidden': true, 'data-react-controller': true });
    }

    const controller = document.createElement('div');
    controller.id = 'react-controller';
    document.body.appendChild(controller);
    ReactDOM.createRoot(controller).render(h(InterfaceController));
})();