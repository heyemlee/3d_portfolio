export class App {
    constructor() {
        this.currentSection = 'intro';
        this.sections = ['intro', 'about', 'work', 'skills'];
        this.isScrolling = false;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.updateActiveSection(this.currentSection);
    }

    setupEventListeners() {
        // 监听滚轮事件
        window.addEventListener('wheel', (e) => this.handleScroll(e));

        // 监听底部导航点击
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.navigateToSection(section);
            });
        });

        // 监听键盘事件
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.handleKeyNavigation(e.key);
            }
        });
    }

    handleScroll(e) {
        if (this.isScrolling) return;

        this.isScrolling = true;
        setTimeout(() => {
            this.isScrolling = false;
        }, 1000);

        const direction = e.deltaY > 0 ? 1 : -1;
        const currentIndex = this.sections.indexOf(this.currentSection);
        let nextIndex = currentIndex + direction;

        if (nextIndex >= 0 && nextIndex < this.sections.length) {
            this.navigateToSection(this.sections[nextIndex]);
        }
    }

    handleKeyNavigation(key) {
        const currentIndex = this.sections.indexOf(this.currentSection);
        let nextIndex = currentIndex + (key === 'ArrowDown' ? 1 : -1);

        if (nextIndex >= 0 && nextIndex < this.sections.length) {
            this.navigateToSection(this.sections[nextIndex]);
        }
    }

    navigateToSection(section) {
        if (section === this.currentSection) return;

        this.currentSection = section;
        this.updateActiveSection(section);
        this.updateCamera(section);
    }

    updateActiveSection(section) {
        // 更新底部导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // 更新内容区域
        document.querySelectorAll('.section').forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === section);
        });
    }

    updateCamera(section) {
        window.dispatchEvent(new CustomEvent('updateCamera', { detail: { section } }));
    }
}
