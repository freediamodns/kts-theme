(function () {
    'use strict';

    var HINTS = 'p.text-muted.small, .form-group p.text-muted, .help-block, p.dz-hint, p.dzb-note';
    var SKIP = 'table, .callout, .alert, .box-footer, .modal-footer, .dz-switch, .dz-check, .sa-hint, .text-center, .text-danger, [data-no-hint]';
    var STOP = '.box-body, .modal-body, .tab-pane, .box, .content';
    var GAP = 8;
    var seq = 0;

    function labelOf(el) {
        if (el.matches('label.dz-switch')) {
            return el.querySelector('.dz-switch-text > strong');
        }

        if (el.matches('.dz-check, .pm-egg')) {
            return null;
        }

        return el.matches('label, .control-label, .dzb-label') ? el : null;
    }

    function anchorFor(hint) {
        var group = hint.closest('.form-group');

        if (group) {
            var labels = group.querySelectorAll('label, .control-label, .dzb-label');

            for (var i = 0; i < labels.length; i++) {
                var label = labelOf(labels[i]);

                if (label && labels[i].compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING && !labels[i].contains(hint)) {
                    return label;
                }
            }
        }

        for (var node = hint; node && !node.matches(STOP); node = node.parentElement) {
            for (var prev = node.previousElementSibling; prev; prev = prev.previousElementSibling) {
                var found = labelOf(prev);

                if (found) {
                    return found;
                }
            }
        }

        var modal = hint.closest('.modal-content');
        var box = hint.closest('.box');

        return (modal && modal.querySelector('.modal-title')) || (box && box.querySelector('.box-header .box-title')) || null;
    }

    function holderFor(label) {
        var holder = label.querySelector(':scope > .sa-hint');

        if (holder) {
            return holder;
        }

        var bubble = document.createElement('span');
        var button = document.createElement('button');

        holder = document.createElement('span');
        holder.className = 'sa-hint';

        bubble.className = 'sa-hint-bubble';
        bubble.id = 'sa-hint-' + ++seq;
        bubble.setAttribute('role', 'tooltip');

        button.type = 'button';
        button.className = 'sa-hint-icon';
        button.setAttribute('aria-label', 'What this means');
        button.setAttribute('aria-describedby', bubble.id);
        button.innerHTML = '<i class="fa fa-info-circle" aria-hidden="true"></i>';

        holder.appendChild(button);
        holder.appendChild(bubble);
        label.appendChild(holder);

        return holder;
    }

    function place(holder) {
        var icon = holder.querySelector('.sa-hint-icon').getBoundingClientRect();
        var bubble = holder.querySelector('.sa-hint-bubble');
        var width = bubble.offsetWidth;
        var height = bubble.offsetHeight;
        var left = Math.min(Math.max(GAP, icon.left + icon.width / 2 - 22), window.innerWidth - width - GAP);
        var below = icon.bottom + GAP + height <= window.innerHeight - GAP || icon.top - GAP - height < GAP;

        bubble.style.left = left + 'px';
        bubble.style.top = (below ? icon.bottom + GAP : icon.top - GAP - height) + 'px';
        bubble.classList.toggle('is-above', !below);
    }

    var timer = null;

    function closeAll(except) {
        document.querySelectorAll('.sa-hint.is-open').forEach(function (holder) {
            if (holder !== except) {
                holder.classList.remove('is-open');
            }
        });
    }

    function open(holder) {
        window.clearTimeout(timer);
        closeAll(holder);
        holder.classList.add('is-open');

        if (holder.querySelector('.sa-hint-bubble').innerText.trim() === '') {
            holder.classList.remove('is-open');

            return;
        }

        place(holder);
    }

    function wire(holder) {
        var button = holder.querySelector('.sa-hint-icon');
        var bubble = holder.querySelector('.sa-hint-bubble');

        holder.addEventListener('pointerenter', function (event) {
            if (event.pointerType === 'mouse') {
                open(holder);
            }
        });

        holder.addEventListener('pointerleave', function (event) {
            if (event.pointerType === 'mouse') {
                timer = window.setTimeout(function () {
                    holder.classList.remove('is-open');
                }, 160);
            }
        });

        button.addEventListener('focus', function () {
            if (button.matches(':focus-visible')) {
                open(holder);
            }
        });

        holder.addEventListener('focusout', function (event) {
            if (!holder.contains(event.relatedTarget)) {
                holder.classList.remove('is-open');
            }
        });

        button.addEventListener('click', function (event) {
            event.preventDefault();

            if (holder.classList.contains('is-open') && event.pointerType !== 'mouse') {
                holder.classList.remove('is-open');
            } else {
                open(holder);
            }
        });

        bubble.addEventListener('click', function (event) {
            if (!event.target.closest('a')) {
                event.preventDefault();
            }
        });
    }

    function build() {
        var holders = [];

        document.querySelectorAll('.content-wrapper ' + HINTS.split(', ').join(', .content-wrapper ')).forEach(function (hint) {
            if (hint.closest(SKIP) || hint.querySelector('input, select, textarea, button')) {
                return;
            }

            var label = anchorFor(hint);

            if (!label) {
                return;
            }

            var holder = holderFor(label);

            holder.querySelector('.sa-hint-bubble').appendChild(hint);

            if (holders.indexOf(holder) === -1) {
                holders.push(holder);
            }
        });

        holders.forEach(wire);
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeAll(null);
        }
    });

    document.addEventListener('click', function (event) {
        if (!(event.target instanceof Element) || !event.target.closest('.sa-hint')) {
            closeAll(null);
        }
    });

    window.addEventListener('scroll', function (event) {
        if (!(event.target instanceof Element && event.target.closest('.sa-hint-bubble'))) {
            closeAll(null);
        }
    }, true);

    window.addEventListener('resize', function () {
        closeAll(null);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
