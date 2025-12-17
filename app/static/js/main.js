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
            if (view === 'bento') {
                notesGrid.classList.add('bento-view');
                notesGrid.classList.remove('list-view'); // Remove legacy class
                notesGrid.classList.remove('gallery-view');
                calculateBentoSizes();
            } else if (view === 'gallery') {
                notesGrid.classList.add('gallery-view');
                notesGrid.classList.remove('list-view'); // Clean up old
                notesGrid.classList.remove('bento-view'); // Clean up old
                initGalleryInteraction();
            } else {
                notesGrid.classList.remove('gallery-view');
                notesGrid.classList.remove('bento-view');
                notesGrid.classList.remove('list-view');
            }

            // Save preference
            localStorage.setItem('notesView', view);
        }

        function calculateBentoSizes() {
            const cards = document.querySelectorAll('.note-card');
            cards.forEach(card => {
                // Reset classes first
                card.classList.remove('span-col-2', 'span-row-2', 'span-big');

                const content = card.dataset.content || '';
                const hasImage = card.dataset.image && card.dataset.image !== '';
                const textLength = content.length;

                // Logic for sizing
                if (hasImage && textLength > 100) {
                    card.classList.add('span-big');
                } else if (textLength > 300) {
                    card.classList.add('span-row-2');
                } else if (textLength > 100 || hasImage) {
                    card.classList.add('span-col-2');
                }
                // Else default (span-1)
            });
        }

        function initGalleryInteraction() {
            const cards = document.querySelectorAll('.note-card');
            if (cards.length > 0) {
                // Set first card active by default if none active
                if (!document.querySelector('.note-card.active')) {
                    cards[0].classList.add('active');
                }

                cards.forEach(card => {
                    card.addEventListener('click', (e) => {
                        // Only applies if in gallery view AND not clicking modal triggers (if any)
                        // But wait, the whole card triggers modal in Grid view.
                        // In Gallery view, we want expand FIRST.
                        // So we need to prevent Modal opening if it's strictly an expand action?
                        // Or maybe Expands AND Opens Modal?
                        // "Click strip -> slides open". This suggests preview.
                        // IF the card is collapsed, we should Expand it and STOP propagation (prevent modal).
                        // IF the card is ALREADY expanded, then maybe open Modal?

                        if (notesGrid.classList.contains('gallery-view')) {
                            if (!card.classList.contains('active')) {
                                e.stopPropagation(); // Stop modal from opening
                                e.preventDefault();

                                // Deactivate others
                                cards.forEach(c => c.classList.remove('active'));
                                // Activate this
                                card.classList.add('active');
                            }
                            // If already active, let it bubble to open modal
                        }
                    }, true); // Capture phase might be needed if modal listener is on card?
                    // Modal listener is: card.addEventListener('click', ...)
                    // Standard bubbling order.
                    // If I put this check inside the Modal Listener, it's messy.
                    // I'll add this listener here. `e.stopPropagation()` works if this listener runs before the modal one?
                    // Or I check `gallery-view` inside the Modal listener?
                    // Actually, the Modal listener is defined below. 
                    // I should attach this listener dynamically or update the Modal listener.
                });
            }
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

    // Flatpickr Initialization
    if (typeof flatpickr !== 'undefined') {
        flatpickr(".date-input", {
            dateFormat: "Y-m-d",
            altInput: true,
            altFormat: "F j, Y",
            theme: "dark",
            disableMobile: "true", // Force custom picker even on mobile for styling consistency
            animate: true,
            prevArrow: '<i class="fas fa-chevron-left"></i>',
            nextArrow: '<i class="fas fa-chevron-right"></i>'
        });
    }

    // Edit Name Logic
    const editBtn = document.getElementById('editNameBtn');
    const nameSpan = document.getElementById('userNameSpan');

    if (editBtn && nameSpan) {
        editBtn.addEventListener('click', () => {
            const currentName = nameSpan.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = currentName;
            input.className = 'name-edit-input';
            input.style.fontSize = 'inherit';
            input.style.fontWeight = 'inherit';
            input.style.border = 'none';
            input.style.borderBottom = '1px solid var(--primary-color)';
            input.style.background = 'transparent';
            input.style.color = 'var(--text-light)';
            input.style.width = Math.max(currentName.length, 10) + 'ch';
            input.style.outline = 'none';

            nameSpan.replaceWith(input);
            input.focus();

            const saveName = async () => {
                const newName = input.value.trim() || currentName;

                try {
                    const res = await fetch('/update_name', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName })
                    });

                    if (res.ok) {
                        nameSpan.textContent = newName;
                        input.replaceWith(nameSpan);
                    } else {
                        alert('Failed to save name');
                        input.replaceWith(nameSpan);
                    }
                } catch (e) {
                    console.error(e);
                    input.replaceWith(nameSpan);
                }
            };

            input.addEventListener('blur', saveName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });
    }
});
