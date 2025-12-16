document.addEventListener('DOMContentLoaded', () => {
    // Current Date
    const dateDisplay = document.getElementById('dateDisplay');
    if (dateDisplay) {
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Auto-dismiss Alerts
    const flashMessages = document.querySelector('.flash-messages');
    if (flashMessages) {
        setTimeout(() => {
            flashMessages.style.opacity = '0';
            flashMessages.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                flashMessages.remove();
            }, 500);
        }, 3000);
    }

    // View Switcher Logic
    const viewSwitcher = document.getElementById('viewSwitcher');
    const notesGrid = document.getElementById('notesGrid');

    if (viewSwitcher && notesGrid) {
        const buttons = viewSwitcher.querySelectorAll('.view-btn');

        // Load preference
        const savedView = localStorage.getItem('notesView') || 'grid';
        applyView(savedView);

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Ensure we get the button element even if icon is clicked
                const targetBtn = e.target.closest('.view-btn');
                if (!targetBtn) return;

                const view = targetBtn.dataset.view;
                applyView(view);
            });
        });

        function applyView(view) {
            // Update active button state
            buttons.forEach(btn => {
                if (btn.dataset.view === view) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update container class
            if (view === 'list') {
                notesGrid.classList.add('list-view');
            } else {
                notesGrid.classList.remove('list-view');
            }

            // Save preference
            localStorage.setItem('notesView', view);
        }
    }

    // Modal Interaction Logic
    const modalBackdrop = document.getElementById('noteModalBackdrop');
    const noteModal = document.getElementById('noteModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalRenderedContent = document.getElementById('modalRenderedContent');
    const modalTags = document.getElementById('modalTags');
    const modalImageContainer = document.getElementById('modalImageContainer');
    const modalImage = document.getElementById('modalImage');
    const closeModalBtn = document.getElementById('closeModalBtn');

    if (modalBackdrop) {
        // Open Modal
        document.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', () => {
                const title = card.dataset.title;
                const content = card.dataset.content;
                const imageUrl = card.dataset.image;
                const color = card.dataset.color;
                const tags = card.dataset.tags;
                const isPublic = card.dataset.public === 'true';
                const publicId = card.dataset.publicId;
                const noteId = card.dataset.id;

                modalTitle.value = title;
                modalContent.innerText = content; // Keep raw content in hidden div just in case
                modalContent.style.display = 'none';

                // Render Markdown
                if (typeof marked !== 'undefined') {
                    modalRenderedContent.innerHTML = marked.parse(content);
                } else {
                    modalRenderedContent.innerText = content; // Fallback
                }
                modalRenderedContent.style.display = 'block';

                // Set Color Theme
                noteModal.className = 'note-modal ' + color;

                // Handle Image
                if (imageUrl) {
                    modalImage.src = imageUrl;
                    modalImageContainer.style.display = 'block';
                } else {
                    modalImageContainer.style.display = 'none';
                }

                // Handle Tags
                modalTags.innerHTML = '';
                if (tags) {
                    const tagList = tags.split(', ');
                    tagList.forEach(tagName => {
                        const span = document.createElement('span');
                        span.className = 'tag-chip';
                        span.textContent = tagName;
                        modalTags.appendChild(span);
                    });
                }

                // Handle Share Logic
                const shareForm = document.getElementById('shareForm');
                const shareLink = document.getElementById('shareLink');
                const shareBtn = document.getElementById('shareBtn');

                if (shareForm) {
                    shareForm.action = `/note/share/${noteId}`;

                    if (isPublic) {
                        shareBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Unshare';
                        if (shareLink) {
                            shareLink.style.display = 'inline';
                            const fullUrl = window.location.origin + '/shared/' + publicId;
                            shareLink.innerHTML = `<a href="${fullUrl}" target="_blank" style="color:var(--primary-color);">Public Link</a>`;
                        }
                    } else {
                        shareBtn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
                        if (shareLink) shareLink.style.display = 'none';
                    }
                }

                // Handle Delete Logic
                const deleteForm = document.getElementById('deleteForm');
                if (deleteForm) {
                    deleteForm.action = `/notes/delete/${noteId}`;
                }

                modalBackdrop.classList.add('open');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            });
        });

        // Close Modal
        function closeModal() {
            modalBackdrop.classList.remove('open');
            document.body.style.overflow = '';
        }

        closeModalBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                closeModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
                closeModal();
            }
        });
    }

    // AJAX Share Logic
    const shareForm = document.getElementById('shareForm');
    if (shareForm) {
        shareForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('shareBtn');
            const linkSpan = document.getElementById('shareLink');

            // Visual feedback processing
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';

            try {
                const res = await fetch(shareForm.action, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                if (!res.ok) throw new Error('Request failed');

                const data = await res.json();

                if (data.success) {
                    // Find card to update state
                    const noteId = shareForm.action.split('/').pop();
                    const card = document.querySelector(`.note-card[data-id="${noteId}"]`);

                    if (data.is_public) {
                        // Update UI to Shared state
                        const url = window.location.origin + '/shared/' + data.public_id;

                        // Copy to Clipboard
                        try {
                            await navigator.clipboard.writeText(url);
                            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            btn.style.color = '#4ade80'; // Success green
                        } catch (err) {
                            console.error('Clipboard failed', err);
                            btn.innerHTML = '<i class="fas fa-eye-slash"></i> Unshare';
                        }

                        // Show Link
                        if (linkSpan) {
                            linkSpan.style.display = 'inline';
                            linkSpan.innerHTML = `<a href="${url}" target="_blank" style="color:var(--primary-color);">Public Link</a>`;
                        }

                        // Revert button text after 2s
                        setTimeout(() => {
                            btn.innerHTML = '<i class="fas fa-eye-slash"></i> Unshare';
                            btn.style.color = 'var(--text-muted)';
                        }, 2000);

                    } else {
                        // Update UI to Unshared state
                        btn.innerHTML = '<i class="fas fa-share-alt"></i> Share';
                        btn.style.color = 'var(--primary-color)';
                        if (linkSpan) linkSpan.style.display = 'none';
                    }

                    // Update Dataset
                    if (card) {
                        card.dataset.public = data.is_public;
                        card.dataset.publicId = data.public_id || '';
                    }
                }
            } catch (err) {
                console.error(err);
                btn.innerHTML = originalContent;
                alert('An error occurred while sharing.');
            }
        });
    }

    // EasyMDE Initialization
    const editorElem = document.getElementById('noteContentEditor');
    if (editorElem && typeof EasyMDE !== 'undefined') {
        new EasyMDE({
            element: editorElem,
            status: false,
            toolbar: ["bold", "italic", "heading", "|", "quote", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview"],
            spellChecker: false,
            minHeight: "150px",
            placeholder: "Take a note..."
        });
    }
});
