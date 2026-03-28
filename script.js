document.addEventListener('DOMContentLoaded', async () => {
    initRevealObserver();
    initCategorySystem();
    await initPortfolio();
    initShowMore();
    initContactForm();
    initProjectPage();
    initKineticTypography();
});

/* =========================================
   ОБЩИЕ НАСТРОЙКИ
========================================= */

const APP_CONFIG = {
    portfolio: {
        initialVisibleCount: 3,
        loadStep: 3,
    },
    project: {
        fallbackId: 1,
        siteName: 'Флагман',
        siteUrl: 'https://твойсайт.ru',
    },
};

const portfolioState = {
    currentCategory: 'all',
    currentSubcategory: null,
    visibleCount: APP_CONFIG.portfolio.initialVisibleCount,
    allProjects: [],
};

/* =========================================
   REVEAL-АНИМАЦИЯ
========================================= */

function initRevealObserver() {
    const revealNodes = Array.from(document.querySelectorAll('.reveal'));

    if (!revealNodes.length || !('IntersectionObserver' in window)) {
        revealNodes.forEach((node) => node.classList.add('active'));
        return;
    }

    const observer = createRevealObserver();
    revealNodes.forEach((node) => observer.observe(node));
}

function activateNewRevealNodes(scope = document) {
    const nodes = Array.from(scope.querySelectorAll('.reveal'));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in window)) {
        nodes.forEach((node) => node.classList.add('active'));
        return;
    }

    const observer = createRevealObserver();
    nodes.forEach((node) => observer.observe(node));
}

function createRevealObserver() {
    return new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
    });
}

/* =========================================
   ПОРТФОЛИО: ЗАГРУЗКА ДАННЫХ
========================================= */

async function initPortfolio() {
    const portfolioGrid = document.getElementById('portfolio-grid');
    if (!portfolioGrid) return;

    try {
        const projects = await fetchProjects();

        portfolioGrid.innerHTML = projects.map(buildPortfolioCard).join('');
        portfolioState.allProjects = Array.from(portfolioGrid.querySelectorAll('.project-card'));

        updateProjectVisibility();
        activateNewRevealNodes(portfolioGrid);
    } catch (error) {
        console.error(error);
        portfolioGrid.innerHTML = `
            <section class="status-box" style="grid-column: 1 / -1;">
                <h2>Ошибка загрузки портфолио</h2>
                <p>Не удалось загрузить проекты. Проверьте файл data.json.</p>
            </section>
        `;

        portfolioState.allProjects = [];
        updateProjectVisibility();
    }
}

async function fetchProjects() {
    const response = await fetch('data.json');
    if (!response.ok) {
        throw new Error('Не удалось загрузить data.json');
    }

    const data = await response.json();
    return Array.isArray(data?.projects) ? data.projects : [];
}

function buildPortfolioCard(project) {
    const id = Number(project.id) || 0;
    const title = escapeHtml(project.title || 'Проект');
    const description = escapeHtml(
        project.previewText || project.subtitle || project.solution || 'Описание проекта'
    );
    const category = escapeAttribute(project.category || '');
    const subcategory = escapeAttribute(project.subcategory || '');
    const href = `project.html?id=${id}`;

    const mediaMarkup = project.previewVideo
        ? `
            <video
                class="project-card-video"
                autoplay
                muted
                loop
                playsinline
                preload="metadata"
                aria-label="${title}"
            >
                <source src="${escapeAttribute(project.previewVideo)}" type="video/mp4">
            </video>
        `
        : `
            <img
                src="${escapeAttribute(project.previewImage || project.cover || 'images/project.jpg')}"
                alt="${title}"
                loading="lazy"
            >
        `;

    return `
        <a href="${href}" class="project-card reveal" data-category="${category}" data-sub="${subcategory}">
            ${mediaMarkup}
            <div class="project-info">
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        </a>
    `;
}

/* =========================================
   ПОРТФОЛИО: КАТЕГОРИИ И ПОДМЕНЮ
========================================= */

function initCategorySystem() {
    const categoryButtons = document.querySelectorAll('.filter-btn[data-category]');
    const subcategoryButtons = document.querySelectorAll('.filter-sub-btn');
    const toggleHiddenCategoriesBtn = document.getElementById('toggle-hidden-categories');

    categoryButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const category = event.currentTarget.dataset.category;

            categoryButtons.forEach((btn) => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');

            document.querySelectorAll('.filter-nav-sub').forEach((submenu) => {
                submenu.style.display = 'none';
            });

            subcategoryButtons.forEach((btn) => btn.classList.remove('active'));

            const submenu = document.getElementById(`submenu-${category}`);
            if (submenu) submenu.style.display = 'flex';

            portfolioState.currentCategory = category;
            portfolioState.currentSubcategory = null;
            portfolioState.visibleCount = APP_CONFIG.portfolio.initialVisibleCount;

            updateProjectVisibility();
        });
    });

    subcategoryButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
            const subcategory = event.currentTarget.dataset.sub;
            const wasActive = event.currentTarget.classList.contains('active');

            subcategoryButtons.forEach((btn) => btn.classList.remove('active'));

            if (wasActive) {
                portfolioState.currentSubcategory = null;
            } else {
                event.currentTarget.classList.add('active');
                portfolioState.currentSubcategory = subcategory;
            }

            portfolioState.visibleCount = APP_CONFIG.portfolio.initialVisibleCount;
            updateProjectVisibility();
        });
    });

    if (toggleHiddenCategoriesBtn) {
        toggleHiddenCategoriesBtn.addEventListener('click', () => {
            const hiddenCategories = document.getElementById('hidden-categories');
            if (!hiddenCategories) return;

            const isHidden = hiddenCategories.style.display === 'none' || hiddenCategories.style.display === '';
            hiddenCategories.style.display = isHidden ? 'flex' : 'none';
            toggleHiddenCategoriesBtn.textContent = isHidden ? 'скрыть ▲' : 'ещё ▼';
        });
    }
}

function getFilteredProjects() {
    return portfolioState.allProjects.filter((project) => {
        const category = project.dataset.category || '';
        const subcategory = project.dataset.sub || '';

        const categoryMatch = portfolioState.currentCategory === 'all' || category === portfolioState.currentCategory;
        const subcategoryMatch = !portfolioState.currentSubcategory || subcategory === portfolioState.currentSubcategory;

        return categoryMatch && subcategoryMatch;
    });
}

function updateProjectVisibility() {
    const filteredProjects = getFilteredProjects();
    const showMoreButton = document.getElementById('show-more-btn');
    const endMessage = document.getElementById('portfolio-end-message');

    portfolioState.allProjects.forEach((project) => {
        project.classList.add('hidden');
    });

    filteredProjects.slice(0, portfolioState.visibleCount).forEach((project) => {
        project.classList.remove('hidden');
    });

    const hasProjects = filteredProjects.length > 0;
    const hasMoreProjects = filteredProjects.length > portfolioState.visibleCount;

    if (showMoreButton) {
        showMoreButton.classList.toggle('hidden', !hasMoreProjects);
    }

    if (endMessage) {
        endMessage.classList.toggle('hidden', hasMoreProjects || !hasProjects);
        endMessage.textContent = hasProjects ? '• • •' : 'По этому направлению кейсы скоро появятся';
    }
}

function initShowMore() {
    const showMoreButton = document.getElementById('show-more-btn');
    if (!showMoreButton) return;

    showMoreButton.addEventListener('click', () => {
        portfolioState.visibleCount += APP_CONFIG.portfolio.loadStep;
        updateProjectVisibility();
    });
}

/* =========================================
   КИНЕТИЧЕСКАЯ ТИПОГРАФИКА
========================================= */

function initKineticTypography() {
    const productionWord = document.getElementById('production-word');
    const printTrail = document.getElementById('print-trail');
    const brandLine = document.getElementById('brand-line');

    if (!productionWord) return;

    setTimeout(() => {
        productionWord.classList.add('revealed');
        if (printTrail) printTrail.classList.add('active');
        if (brandLine) brandLine.classList.add('active');
        productionWord.classList.add('glow-active');
    }, 700);
}

/* =========================================
   ФОРМА ОБРАТНОЙ СВЯЗИ
========================================= */

function initContactForm() {
    const form = document.getElementById('demo-form');
    if (!form) return;

    const successBlock = document.getElementById('form-success');
    const messageRow = document.getElementById('message-row');

    const fields = {
        name: document.getElementById('name'),
        phone: document.getElementById('phone'),
        email: document.getElementById('email'),
        service: document.getElementById('service'),
        message: document.getElementById('message'),
        consent: document.getElementById('consent'),
    };

    const validRussianCodes = new Set([
        '901', '902', '903', '904', '905', '906', '908', '909',
        '910', '911', '912', '913', '914', '915', '916', '917', '918', '919',
        '920', '921', '922', '923', '924', '925', '926', '927', '928', '929',
        '930', '931', '932', '933', '934', '935', '936', '937', '938', '939',
        '950', '951', '952', '953', '954', '955', '956', '957', '958', '959',
        '960', '961', '962', '963', '964', '965', '966', '967', '968', '969',
        '970', '971', '972', '973', '974', '975', '976', '977', '978', '979',
        '980', '981', '982', '983', '984', '985', '986', '987', '988', '989',
        '990', '991', '992', '993', '994', '995', '996', '997', '998', '999',
    ]);

    const allowedEmailTlds = new Set([
        'ru', 'su', 'рф', 'com', 'net', 'org', 'biz', 'info',
        'io', 'co', 'pro', 'online', 'site', 'tech', 'store',
        'me', 'name', 'agency', 'studio', 'company',
    ]);

    if (fields.service && messageRow && fields.message) {
        fields.service.addEventListener('change', () => {
            const isOther = fields.service.value === 'other';
            messageRow.classList.toggle('is-hidden', !isOther);
            fields.message.required = isOther;

            if (!isOther) {
                fields.message.value = '';
                clearError('message');
            }
        });
    }

    if (fields.phone) {
        initPhoneMask(fields.phone);
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearAllErrors();

        let isValid = true;

        const nameValue = fields.name?.value.trim() || '';
        const phoneDigits = (fields.phone?.value || '').replace(/\D/g, '');
        const emailValue = (fields.email?.value || '').trim().toLowerCase();
        const serviceValue = fields.service?.value || '';
        const messageValue = fields.message?.value.trim() || '';

        if (!/^[A-Za-zА-Яа-яЁё\s-]{2,}$/.test(nameValue)) {
            setError('name', 'Введите имя корректно: минимум 2 символа, только буквы, пробелы или дефис.');
            isValid = false;
        }

        if (phoneDigits.length !== 10 || /^(\d)\1{9}$/.test(phoneDigits)) {
            setError('phone', 'Введите реальный номер из 10 цифр.');
            isValid = false;
        } else if (!validRussianCodes.has(phoneDigits.slice(0, 3))) {
            setError('phone', 'Введите реальный российский код оператора.');
            isValid = false;
        }

        if (!isCorporateLikeEmail(emailValue, allowedEmailTlds)) {
            setError('email', 'Введите корректный email с реальным доменом.');
            isValid = false;
        }

        if (!serviceValue) {
            setError('service', 'Выберите направление проекта.');
            isValid = false;
        }

        if (serviceValue === 'other' && messageRow && !messageValue) {
            setError('message', 'Опишите вашу задачу.');
            isValid = false;
        }

        if (!fields.consent?.checked) {
            setError('consent', 'Нужно согласие на обработку персональных данных.');
            isValid = false;
        }

        if (!isValid) return;

        form.classList.add('is-hidden');
        successBlock?.classList.remove('is-hidden');
        successBlock?.focus?.();
    });

    form.querySelectorAll('input, select, textarea').forEach((element) => {
        const eventName = element.type === 'checkbox' ? 'change' : 'input';
        element.addEventListener(eventName, () => clearError(element.id));
    });

    function setError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);

        if (field) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
        }

        if (error) error.textContent = message;
    }

    function clearError(fieldId) {
        const field = document.getElementById(fieldId);
        const error = document.getElementById(`${fieldId}-error`);

        if (field) {
            field.classList.remove('error');
            field.removeAttribute('aria-invalid');
        }

        if (error) error.textContent = '';
    }

    function clearAllErrors() {
        Object.keys(fields).forEach((key) => clearError(key));
    }
}

function initPhoneMask(input) {
    input.addEventListener('input', (event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
        event.target.value = formatPhoneDigits(digits);
    });

    input.addEventListener('blur', () => {
        const digits = input.value.replace(/\D/g, '');
        if (!digits.length) input.value = '';
    });
}

function formatPhoneDigits(digits) {
    if (!digits) return '';

    let output = `(${digits.slice(0, 3)}`;
    if (digits.length >= 4) output += `) ${digits.slice(3, 6)}`;
    if (digits.length >= 7) output += `-${digits.slice(6, 8)}`;
    if (digits.length >= 9) output += `-${digits.slice(8, 10)}`;
    return output;
}

function isCorporateLikeEmail(email, allowedTlds) {
    if (!email || email.length > 254) return false;

    const match = email.match(/^([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-zа-яё]{2,})$/i);
    if (!match) return false;

    const localPart = match[1];
    const domain = match[2].toLowerCase();

    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;
    if (domain.includes('..')) return false;

    const parts = domain.split('.');
    const tld = parts[parts.length - 1];

    if (!allowedTlds.has(tld)) return false;
    if (parts.some((part) => !part || part.length > 63)) return false;
    if (!/[a-zа-яё]/i.test(parts[0])) return false;

    return true;
}

/* =========================================
   СТРАНИЦА ПРОЕКТА
========================================= */

function initProjectPage() {
    const projectContent = document.getElementById('project-content');
    const isProjectPage = document.body.classList.contains('project-page');

    if (!isProjectPage || !projectContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = Number.parseInt(urlParams.get('id') || String(APP_CONFIG.project.fallbackId), 10);

    fetchProjects()
        .then((projects) => {
            const project = projects.find((item) => Number(item.id) === projectId) || projects[0];

            if (!project) {
                renderProjectState(projectContent, {
                    title: 'Проект не найден',
                    text: 'Не удалось найти запрошенный кейс. Вернитесь к портфолио и выберите другой проект.',
                    buttonText: 'Вернуться к портфолио',
                });
                return;
            }

            document.title = `${project.title} | ${APP_CONFIG.project.siteName}`;
            renderProject(projectContent, project);
            activateNewRevealNodes(projectContent);
        })
        .catch((error) => {
            console.error(error);
            renderProjectState(projectContent, {
                title: 'Ошибка загрузки',
                text: 'Не удалось загрузить материалы проекта. Попробуйте обновить страницу.',
                buttonText: 'На главную',
            });
        });
}

function renderProjectState(container, options) {
    const { title, text, buttonText } = options;

    container.innerHTML = `
        <section class="status-box">
            <div class="container">
                <h1>${escapeHtml(title)}</h1>
                <p>${escapeHtml(text)}</p>
                <a href="index.html#portfolio" class="btn-primary">${escapeHtml(buttonText)}</a>
            </div>
        </section>
    `;
}

function renderProject(container, project) {
    const heroStyle = buildHeroBackground(project.cover);
    const processSteps = buildProcessSteps(project.process);
    const statsItems = buildStatsItems(project.stats);
    const galleryItems = buildGalleryItems(project.gallery);
    const videoBlock = buildProjectVideo(project.video);

    const locationMarkup = project.location
        ? `<span>Локация<b>${escapeHtml(project.location)}</b></span>`
        : '';

    updateProjectMeta(project);

    container.innerHTML = `
        <section class="case-hero" style="${heroStyle}">
            <div class="container">
                <div class="case-header reveal">
                    <h1>${escapeHtml(project.title || 'Проект')}</h1>
                    ${project.subtitle ? `<p class="project-subtitle">${escapeHtml(project.subtitle)}</p>` : ''}

                    <div class="case-meta">
                        ${project.client ? `<span>Клиент<b>${escapeHtml(project.client)}</b></span>` : ''}
                        ${project.type ? `<span>Тип работ<b>${escapeHtml(project.type)}</b></span>` : ''}
                        ${project.duration ? `<span>Срок<b>${escapeHtml(project.duration)}</b></span>` : ''}
                        ${locationMarkup}
                    </div>
                </div>
            </div>
        </section>

        <section class="section-padding">
            <div class="container reveal">
                <div class="grid-split">
                    <article>
                        <span class="section-label">01. Задача</span>
                        <h2>С чем пришел клиент</h2>
                        <p>${escapeHtml(project.task || 'Описание задачи будет добавлено позже.')}</p>
                    </article>

                    <article>
                        <span class="section-label">02. Решение</span>
                        <h2>Что предложили</h2>
                        <p>${escapeHtml(project.solution || 'Описание решения будет добавлено позже.')}</p>
                    </article>
                </div>
            </div>
        </section>

        ${videoBlock}

        <section class="section-padding">
            <div class="container reveal">
                <div class="process-layout">
                    <div
                        class="process-image gallery-item"
                        style="background-image: url('${escapeAttribute(project.processImage || project.cover || '')}');"
                        aria-label="Изображение процесса проекта"
                    ></div>

                    <div>
                        <span class="section-label">03. Процесс</span>
                        <h2>Как это создавалось</h2>
                        ${processSteps || '<div class="process-step"><div class="process-number">01</div><p>Этапы проекта будут добавлены позже.</p></div>'}
                    </div>
                </div>
            </div>
        </section>

        <section class="section-padding">
            <div class="container reveal">
                <div class="result-box">
                    <span class="section-label">04. Результат</span>
                    <h2>${escapeHtml(project.result || 'Результат проекта')}</h2>
                    ${statsItems ? `<ul class="stats-list">${statsItems}</ul>` : ''}
                </div>
            </div>
        </section>

        <section class="section-padding">
            <div class="container reveal">
                <span class="section-label">05. Детали</span>
                <h2>Фото готовых элементов</h2>
                <div class="case-gallery">
                    ${galleryItems || `
                        <div class="gallery-item span-12" style="background-image: url('${escapeAttribute(project.cover || '')}');"></div>
                    `}
                </div>
            </div>
        </section>
    `;
}

function updateProjectMeta(project) {
    const title = `${project.title || 'Проект'} | ${APP_CONFIG.project.siteName}`;
    const description = (project.task || project.solution || 'Кейс проекта').slice(0, 150);
    const ogDescription = `${(project.task || project.solution || 'Кейс проекта').slice(0, 120)}…`;
    const ogImage = `${APP_CONFIG.project.siteUrl}/${project.cover || ''}`;

    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', ogDescription);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', ogImage);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', window.location.href);
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

function buildProjectVideo(videoPath) {
    if (!videoPath) return '';

    return `
        <section class="section-padding">
            <div class="container reveal">
                <span class="section-label">03. Видео</span>
                <h2>Брендовый ролик</h2>
                <div class="project-video-box">
                    <video controls playsinline preload="metadata" class="project-video-player">
                        <source src="${escapeAttribute(videoPath)}" type="video/mp4">
                    </video>
                </div>
            </div>
        </section>
    `;
}

function buildHeroBackground(imageUrl) {
    const safeUrl = escapeAttribute(imageUrl || '');
    return `
        background-image:
            linear-gradient(180deg, rgba(17,19,21,0.02) 0%, rgba(17,19,21,0.82) 100%),
            url('${safeUrl}');
        background-size: cover;
        background-position: center;
    `.replace(/\s+/g, ' ').trim();
}

function buildProcessSteps(process) {
    if (!Array.isArray(process) || !process.length) return '';

    return process
        .map((step, index) => {
            const number = escapeHtml(step.step || String(index + 1).padStart(2, '0'));
            const description = escapeHtml(step.description || '');

            return `
                <div class="process-step">
                    <div class="process-number">${number}</div>
                    <p>${description}</p>
                </div>
            `;
        })
        .join('');
}

function buildStatsItems(stats) {
    if (!stats) return '';

    let items = [];

    if (Array.isArray(stats)) {
        items = stats;
    } else if (typeof stats === 'string') {
        items = stats
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    } else {
        return '';
    }

    return items
        .map((item) => {
            const parsed = parseStatLine(item);

            if (!parsed) {
                return `<li>${escapeHtml(String(item))}</li>`;
            }

            return `
                <li>
                    <strong>${escapeHtml(parsed.value)}</strong>
                    ${escapeHtml(parsed.label)}
                </li>
            `;
        })
        .join('');
}

function parseStatLine(item) {
    const text = String(item).trim();
    if (!text) return null;

    const match = text.match(/^([+\-]?\d+[%\w]*)\s+(.+)$/u);
    if (!match) return null;

    return {
        value: match[1],
        label: match[2],
    };
}

function buildGalleryItems(gallery) {
    if (!Array.isArray(gallery) || !gallery.length) return '';

    return gallery
        .map((item) => {
            const size = normalizeGallerySize(item.size);
            const image = escapeAttribute(item.image || '');
            return `<div class="gallery-item ${size}" style="background-image: url('${image}');"></div>`;
        })
        .join('');
}

function normalizeGallerySize(size) {
    const allowedSizes = new Set(['span-4', 'span-8', 'span-12']);
    return allowedSizes.has(size) ? size : 'span-12';
}

/* =========================================
   ХЕЛПЕРЫ БЕЗОПАСНОСТИ
========================================= */

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}
