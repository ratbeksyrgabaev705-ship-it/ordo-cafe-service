(function () {
    let restaurants = [];
    let restaurantMap = {};
    let newOrders = [];
    let currentOrder = null;
    let operatorName = localStorage.getItem('ratlionOperator') || 'Оператор';

    const AYLAR = ['Учт', 'Бир', 'Же', 'Чап', 'Беш', 'Кул', 'Тек', 'Баш', 'Аяк', 'Тог', 'Жет', 'Бек'];

    function q(id) { return document.getElementById(id); }
    function money(v) { return Number(v || 0).toLocaleString('ky-KG', { maximumFractionDigits: 0 }); }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function fmtTime(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('ky-KG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    function restName(id) {
        const r = restaurantMap[id];
        return r ? r.name : '—';
    }
    function statusLabel(status) {
        const map = {
            NEW: 'Жаңы',
            ACCEPTED: 'Кабыл алынды',
            COOKING: 'Даярдалууда',
            READY: 'Даяр',
            GIVEN_TO_COURIER: 'Курьерге берилди',
            DELIVERED: 'Жеткирилди',
            CANCELLED: 'Четке кагылды'
        };
        return map[status] || status || '—';
    }
    function statusBadgeClass(status) {
        if (status === 'NEW') return 'delivery-badge-new';
        if (status === 'DELIVERED') return 'delivery-badge-delivered';
        if (status === 'CANCELLED') return 'delivery-badge-cancelled';
        if (status === 'COOKING' || status === 'READY') return 'delivery-badge-cooking';
        return 'delivery-badge-accepted';
    }
    function paymentLabel(status) {
        if (status === 'PAID') return 'Төлөндү';
        if (status === 'WAITING_PAYMENT' || status === 'WAITING') return 'Төлөм күтүлүүдө';
        return status || '—';
    }
    function timelineRow(label, iso) {
        if (!iso) return '';
        return `<div><label>${esc(label)}</label><span>${fmtTime(iso)}</span></div>`;
    }
    function renderOrderDetail(order) {
        const num = order.displayOrderNumber || ('#' + order.id);
        return `
            <div class="delivery-detail-grid">
                <div class="delivery-detail-row">
                    <strong>Абалы</strong>
                    <span><span class="delivery-badge ${statusBadgeClass(order.orderStatus)}">${esc(statusLabel(order.orderStatus))}</span></span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Ресторан</strong>
                    <span>${esc(restName(order.restaurantId))}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Кардар</strong>
                    <span>${esc(order.customerName)}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Телефон</strong>
                    <span>${esc(order.phone)}</span>
                </div>
                <div class="delivery-detail-row full">
                    <strong>Дарек</strong>
                    <span>${esc(order.address || '—')}</span>
                </div>
                ${order.comment ? `<div class="delivery-detail-row full"><strong>Комментарий</strong><span>${esc(order.comment)}</span></div>` : ''}
                <div class="delivery-detail-row full">
                    <strong>Тамактар</strong>
                    <div class="delivery-detail-items">${esc(order.itemName || '—')}</div>
                </div>
                <div class="delivery-detail-row">
                    <strong>Жалпы дана</strong>
                    <span>${order.quantity != null ? order.quantity : '—'}</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Жалпы сумма</strong>
                    <span><strong>${money(order.totalPrice)} сом</strong></span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Төлөнгөн сумма</strong>
                    <span>${money(order.paymentAmount != null ? order.paymentAmount : order.totalPrice)} сом</span>
                </div>
                <div class="delivery-detail-row">
                    <strong>Төлөм абалы</strong>
                    <span>${esc(paymentLabel(order.paymentStatus))}</span>
                </div>
                ${order.operatorName ? `<div class="delivery-detail-row"><strong>Оператор</strong><span>${esc(order.operatorName)}</span></div>` : ''}
                <div class="delivery-detail-row full">
                    <strong>Убакыт тарыхы</strong>
                    <div class="delivery-detail-timeline">
                        ${timelineRow('Түзүлгөн', order.createdAt)}
                        ${timelineRow('Кабыл алынды', order.acceptedAt)}
                        ${timelineRow('Даярдалууда', order.cookingStartedAt)}
                        ${timelineRow('Даяр', order.readyAt)}
                        ${timelineRow('Курьерге', order.courierAt)}
                        ${timelineRow('Жеткирилди', order.deliveredAt)}
                    </div>
                </div>
                <div class="delivery-detail-row full delivery-receipt">
                    <strong>Төлөмдүн чеги</strong>
                    ${order.receiptImagePath
                        ? `<img src="${esc(order.receiptImagePath)}" alt="Төлөмдүн чеги" onclick="window.open('${esc(order.receiptImagePath)}')">`
                        : '<span>—</span>'}
                </div>
            </div>`;
    }

    function todayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    async function init() {
        q('dOperator').value = operatorName;
        await loadRestaurants();
        dNav('dashboard', document.querySelector('[data-sec="dashboard"]'));
        setInterval(refreshDashboard, 10000);
        window.addEventListener('hashchange', handleHash);
    }

    async function loadRestaurants() {
        const res = await fetch('/api/restaurants');
        restaurants = await res.json();
        restaurantMap = {};
        restaurants.forEach(r => { restaurantMap[r.id] = r; });
    }

    window.dNav = function (section, btn) {
        document.querySelectorAll('.delivery-nav-item').forEach(n => n.classList.remove('active'));
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.delivery-section').forEach(s => s.classList.remove('active'));
        q('sec-' + section).classList.add('active');
        location.hash = section;
        if (section === 'dashboard') refreshDashboard();
        if (section === 'new-orders') loadNewOrders();
        if (section === 'restaurants') renderRestaurants();
        if (section === 'reports') initReports();
        if (section === 'history') { populateHistRest(); loadHistory(); }
    };

    function handleHash() {
        const h = (location.hash || '#dashboard').replace('#', '');
        const btn = document.querySelector(`.delivery-nav-item[data-sec="${h}"]`);
        if (btn) dNav(h, btn);
    }

    async function refreshDashboard() {
        try {
            const [newRes, allRes, todayRep] = await Promise.all([
                fetch('/orders/new'),
                fetch('/orders'),
                fetch('/reports/today')
            ]);
            newOrders = await newRes.json();
            const all = await allRes.json();
            const today = await todayRep.json();

            const todayDelivered = all.filter(o => o.orderStatus === 'DELIVERED' && (o.deliveredAt || o.createdAt || '').slice(0, 10) === todayStr());
            const pending = all.filter(o => o.orderStatus === 'NEW');
            const delivered = all.filter(o => o.orderStatus === 'DELIVERED');
            const cancelled = all.filter(o => o.orderStatus === 'CANCELLED');

            const month = new Date().getMonth() + 1;
            const year = new Date().getFullYear();
            const monthRep = await fetch('/reports/monthly?year=' + year + '&month=' + month).then(r => r.json());

            const restRev = {};
            delivered.forEach(o => {
                if (!o.restaurantId) return;
                restRev[o.restaurantId] = (restRev[o.restaurantId] || 0) + Number(o.totalPrice || 0);
            });
            let topRestId = null, topRestRev = 0;
            Object.entries(restRev).forEach(([id, rev]) => {
                if (rev > topRestRev) { topRestRev = rev; topRestId = id; }
            });

            const sold = today.soldItems || {};
            const topFood = Object.entries(sold).sort((a,b) => b[1]-a[1])[0];

            q('dStatTodayOrders').textContent = today.totalOrders || todayDelivered.length;
            q('dStatTodayRev').textContent = money(today.totalRevenue) + ' с';
            q('dStatPending').textContent = pending.length;
            q('dStatDelivered').textContent = delivered.length;
            q('dStatCancelled').textContent = cancelled.length;
            q('dStatRest').textContent = restaurants.length;
            q('dStatMonthRev').textContent = money(monthRep.totalRevenue) + ' с';
            q('dStatTopRest').textContent = topRestId ? restName(Number(topRestId)) : '—';
            q('dStatTopFood').textContent = topFood ? topFood[0] : '—';
            q('dBadgeNew').textContent = newOrders.length;
        } catch (e) { /* silent */ }
    }

    async function loadNewOrders() {
        try {
            const res = await fetch('/orders/new');
            newOrders = await res.json();
            q('dBadgeNew').textContent = newOrders.length;
            const el = q('dNewList');
            if (!newOrders.length) {
                el.innerHTML = '<div class="delivery-empty">Текшериле турган заказ жок</div>';
                return;
            }
            el.innerHTML = `<table class="delivery-table"><thead><tr>
                <th>Ресторан</th><th>Заказ №</th><th>Кардар</th><th>Телефон</th><th>Сумма</th><th>Убакыт</th>
            </tr></thead><tbody>${newOrders.map(o => `
                <tr class="delivery-order-row" onclick="dOpenOrder(${o.id})">
                    <td>${esc(restName(o.restaurantId))}</td>
                    <td><strong>#${o.id}</strong></td>
                    <td>${esc(o.customerName)}</td>
                    <td>${esc(o.phone)}</td>
                    <td>${money(o.totalPrice)} сом</td>
                    <td>${fmtTime(o.createdAt)}</td>
                </tr>`).join('')}</tbody></table>`;
        } catch (e) { q('dNewList').innerHTML = '<div class="delivery-empty">Жүктөлбөдү</div>'; }
    }

    function renderRestaurants() {
        q('dRestGrid').innerHTML = restaurants.map(r => `
            <article class="delivery-rest-card" onclick="dOpenRestaurant(${r.id})">
                <h3>${r.emoji || '🏪'} ${esc(r.name)}</h3>
                <p>${esc(r.tagline || r.address || '—')}</p>
                <span class="delivery-badge ${r.active !== false ? 'delivery-badge-accepted' : 'delivery-badge-rejected'}">
                    ${r.active !== false ? 'Ачык' : 'Жабык'}
                </span>
            </article>`).join('');
    }

    window.dOpenRestaurant = function (id) {
        const r = restaurantMap[id];
        if (!r) return;
        q('dRestModalTitle').textContent = 'Ресторан маалыматы';
        q('dRestModalBody').innerHTML = `
            <div class="delivery-detail-grid">
                <div><strong>Ресторандын аты</strong><br>${esc(r.name)}</div>
                <div><strong>Абалы</strong><br>${r.active !== false ? '🟢 Ачык' : '🔴 Жабык'}</div>
                <div><strong>Телефон</strong><br>${esc(r.phone || '—')}</div>
                <div><strong>Дарек</strong><br>${esc(r.address || '—')}</div>
                <div class="full" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
                    <button class="delivery-btn delivery-btn-sm ${r.active ? 'delivery-btn-green' : 'delivery-btn-outline'}" onclick="dToggleRest(${r.id}, ${!r.active})">${r.active ? 'Ресторанды жабуу' : 'Ресторанды ачуу'}</button>
                    <a class="delivery-btn delivery-btn-outline delivery-btn-sm" href="/kitchen?slug=${esc(r.slug)}" target="_blank">🍳 Кухня</a>
                    <button class="delivery-btn delivery-btn-outline delivery-btn-sm" onclick="dGoReports(${r.id})">📊 Отчеттор</button>
                </div>
            </div>`;
        q('dRestModal').classList.add('open');
    };

    window.dCloseRestModal = function () { q('dRestModal').classList.remove('open'); };

    window.dGoReports = function (restId) {
        dCloseRestModal();
        dNav('reports', document.querySelector('[data-sec="reports"]'));
        q('dRepRest').value = restId;
        loadReportHistoryNav();
    };

    window.dToggleRest = async function (id, active) {
        const r = restaurantMap[id];
        if (!r) return;
        await fetch('/api/restaurants/' + id, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...r, active })
        });
        await loadRestaurants();
        renderRestaurants();
        dOpenRestaurant(id);
    };

    function initReports() {
        const sel = q('dRepRest');
        sel.innerHTML = '<option value="">Ресторан тандаңыз</option>' +
            restaurants.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
        loadReportHistoryNav();
        q('dRepRest').onchange = loadReportHistoryNav;
    }

    async function loadReportHistoryNav() {
        const rid = q('dRepRest').value;
        const years = await ReportsUI.fetchYears(rid ? rid : null);
        const nav = q('dRepHistoryNav');
        nav.innerHTML = years.map(y => `
            <span class="rep-year-label">${y}</span>
            ${AYLAR.map((m, i) => `<button type="button" class="rep-month-btn" onclick="dLoadMonthReport(${y},${i+1})">${m}</button>`).join('')}
        `).join('');
    }

    window.dLoadMonthReport = async function (year, month) {
        const rid = q('dRepRest').value;
        if (!rid) { alert('Ресторан тандаңыз'); return; }
        q('dRepResult').innerHTML = ReportsUI.renderReport(await ReportsUI.fetchMonthly(year, month, rid));
    };

    window.dLoadReport = async function () {
        const rid = q('dRepRest').value;
        if (!rid) { alert('Ресторан тандаңыз'); return; }
        try {
            const data = await ReportsUI.fetchSummary(q('dRepPreset').value, rid, q('dRepFrom').value, q('dRepTo').value);
            q('dRepResult').innerHTML = ReportsUI.renderReport(data);
        } catch (e) { q('dRepResult').innerHTML = '<div class="delivery-empty">Жүктөлбөдү</div>'; }
    };

    function populateHistRest() {
        const sel = q('dHistRest');
        if (sel.options.length > 1) return;
        sel.innerHTML = '<option value="">Бардык ресторандар</option>' +
            restaurants.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
    }

    async function loadHistory() {
        const p = [];
        if (q('dHistFrom').value) p.push('from=' + q('dHistFrom').value);
        if (q('dHistTo').value) p.push('to=' + q('dHistTo').value);
        if (q('dHistRest').value) p.push('restaurantId=' + q('dHistRest').value);
        p.push('status=DELIVERED');
        try {
            const list = await fetch('/orders/history?' + p.join('&')).then(r => r.json());
            q('dHistBody').innerHTML = list.length ? list.map(o => `<tr class="delivery-order-row" onclick="dOpenOrder(${o.id})">
                <td><strong>${esc(o.displayOrderNumber || o.id)}</strong></td>
                <td>${esc(restName(o.restaurantId))}</td>
                <td>${esc(o.customerName)}</td>
                <td>${esc(o.phone)}</td>
                <td>${esc(o.itemName || '—')}</td>
                <td>${money(o.totalPrice)}</td>
                <td>${fmtTime(o.deliveredAt || o.createdAt)}</td>
                <td>${esc(o.operatorName || '—')}</td>
                <td>${o.receiptImagePath ? `<a href="${esc(o.receiptImagePath)}" target="_blank" class="delivery-hist-receipt" title="Төлөмдүн чеги" onclick="event.stopPropagation()">🧾</a>` : '—'}</td>
            </tr>`).join('') : '<tr><td colspan="9" class="delivery-empty">Жазуу жок</td></tr>';
        } catch (e) {
            q('dHistBody').innerHTML = '<tr><td colspan="9" class="delivery-empty">Жүктөлбөдү</td></tr>';
        }
    }

    window.dLoadHistory = loadHistory;

    window.dOpenOrder = async function (id) {
        const res = await fetch('/orders/' + id);
        if (!res.ok) return;
        currentOrder = await res.json();
        const num = currentOrder.displayOrderNumber || ('#' + currentOrder.id);
        q('dModalTitle').textContent = 'Заказ ' + num;
        q('dModalBody').innerHTML = renderOrderDetail(currentOrder);
        const actions = q('dModalActions');
        if (currentOrder.orderStatus === 'NEW') {
            actions.style.display = 'flex';
        } else {
            actions.style.display = 'none';
        }
        q('dModal').classList.add('open');
    };

    window.dCloseModal = function () {
        q('dModal').classList.remove('open');
        currentOrder = null;
    };

    window.dAccept = async function () {
        if (!currentOrder) return;
        const res = await fetch('/orders/' + currentOrder.id + '/accept?operator=' + encodeURIComponent(operatorName), { method: 'PUT' });
        if (res.ok) { dCloseModal(); refreshDashboard(); loadNewOrders(); }
        else alert('Кабыл алуу ишке ашкан жок');
    };

    window.dReject = async function () {
        if (!currentOrder || !confirm('Четке кагасызбы? Ресторан бул заказды көрбөйт.')) return;
        await fetch('/orders/' + currentOrder.id + '/cancel?operator=' + encodeURIComponent(operatorName), { method: 'PUT' });
        dCloseModal(); refreshDashboard(); loadNewOrders();
    };

    window.dSaveOperator = function () {
        operatorName = q('dOperator').value.trim() || 'Оператор';
        localStorage.setItem('ratlionOperator', operatorName);
        alert('Сакталды');
    };

    init();
})();
