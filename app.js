const tg = window.Telegram.WebApp;
let currentBet = 0;
let userBalance = 100;

tg.ready();
tg.expand();

// Загрузка профиля
const loadProfile = async () => {
    try {
        const response = await fetch(`/api/profile?initData=${encodeURIComponent(tg.initData)}`);
        const data = await response.json();
        userBalance = data.balance;
        document.getElementById('balance').textContent = `Баланс: ${userBalance} ECO`;
    } catch (error) {
        tg.showAlert('Ошибка загрузки профиля');
    }
};

// Обработчики ставок
document.querySelectorAll('.bet-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentBet = parseInt(btn.dataset.bet);
        document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        tg.HapticFeedback.impactOccurred('light');
    });
});

// Обработчики элементов
document.querySelectorAll('.element-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        if (!currentBet) return tg.showAlert('Сначала выберите ставку!');
        if (currentBet > userBalance) return tg.showAlert('Недостаточно средств!');

        try {
            const response = await fetch('/api/duel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initData: tg.initData,
                    bet: currentBet,
                    element: btn.dataset.element
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'waiting') {
                document.getElementById('status').textContent = '⚔️ Ожидаем соперника...';
                pollDuelStatus(data.duelId);
            } else {
                updateGameResult(data);
            }
        } catch (error) {
            tg.showAlert('Ошибка соединения с сервером');
        }
    });
});

// Опрос статуса дуэли
const pollDuelStatus = async (duelId) => {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/duel/${duelId}`);
            const data = await response.json();
            
            if (data.status === 'completed') {
                clearInterval(interval);
                updateGameResult(data);
            }
        } catch (error) {
            clearInterval(interval);
            tg.showAlert('Ошибка обновления статуса');
        }
    }, 2000);
};

// Обновление результатов
const updateGameResult = (data) => {
    userBalance = data.newBalance;
    document.getElementById('balance').textContent = `Баланс: ${userBalance} ECO`;
    
    let message = `🌿 ${data.element1} vs ${data.element2} 🔥\n`;
    message += data.winner === 'draw' 
        ? "🤝 Ничья! Ставки возвращены" 
        : `🏆 Победитель: ${data.winner}\n💰 Выигрыш: ${data.prize} ECO`;

    document.getElementById('status').textContent = message;
    tg.showAlert(message);
    
    if (data.winner !== 'draw') {
        const winnerElement = data[`element${data.winner === 'player1' ? 1 : 2}`];
        document.querySelector(`[data-element="${winnerElement}"]`).classList.add('winner-animation');
        setTimeout(() => {
            document.querySelector(`[data-element="${winnerElement}"]`).classList.remove('winner-animation');
        }, 2000);
    }
};

// Управление кошельком
document.getElementById('set-wallet').addEventListener('click', async () => {
    const wallet = document.getElementById('wallet-input').value.trim();
    
    if (!/^EQ[0-9a-zA-Z]{48}$/.test(wallet)) {
        return tg.showAlert('Неверный формат TON кошелька');
    }

    try {
        await fetch('/api/wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: tg.initData,
                wallet
            })
        });
        tg.showAlert('✅ Кошелек сохранен');
    } catch (error) {
        tg.showAlert('❌ Ошибка сохранения');
    }
});

// Вывод средств
document.getElementById('withdraw-btn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: tg.initData,
                amount: 1
            })
        });
        
        const result = await response.json();
        if (result.success) {
            tg.showAlert(`✅ Успешно выведено 1 TON!\nTX Hash: ${result.hash}`);
        } else {
            tg.showAlert(`❌ Ошибка: ${result.error}`);
        }
    } catch (error) {
        tg.showAlert('❌ Ошибка соединения');
    }
});

// Инициализация
loadProfile();