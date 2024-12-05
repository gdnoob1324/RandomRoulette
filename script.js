function getRandomInt(min, max) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

function keyevent(e) {
    const txt = document.getElementById('input');
    const div = document.getElementById('items');

    if (e.keyCode == 13 && e.target.value != '') {
        const item = document.createElement('span');
        item.innerText = e.target.value;
        e.target.value = '';

        const button = document.createElement('div');
        button.innerText = '✕';
        button.addEventListener('click', (e) => {
            e.target.parentElement.remove();
        });
        item.appendChild(button);
        div.appendChild(item);
    }
}

let roller;
window.onload = function () {

    window.onblur = function() {
        document.documentElement.style.setProperty('--selection-color', '#a8a8a8a0');
      }
      
      window.onfocus = function() {
        document.documentElement.style.setProperty('--selection-color', '#0044CEc0');
      }
      
      document.documentElement.style.setProperty('--selection-color', '#0044CEc0');

    document.querySelector('h2').onclick = function (e) {
        e.target.innerText = '';
    };

    document.querySelector('#items > div').onclick = function (e) {
        const spans = document.querySelectorAll('#items span');
        Array.from(spans).forEach(span => span.remove());
    };

    let isSpinning = false;

    document.getElementById("start").addEventListener("click", function () {
        if (isSpinning) return;
        isSpinning = true;

        document.querySelector('h2').innerText = '추첨 중..'
        const r = document.querySelector('.roulette');
        r.innerHTML = '';
        let items = document.querySelectorAll('#items span');

        if (items.length < 2) {
            document.querySelector('h2').innerText = '항목을 2개 이상 추가해 주세요!';
            isSpinning = false;
            return;
        }

        Array.from(items).forEach((item) => {
            const duplicatedItem = document.createElement('div');
            duplicatedItem.innerText = item.firstChild.nodeValue.trim();
            r.appendChild(duplicatedItem);
        });

        document.querySelector('.roulette').style.width = '';
        roller = new Roulette(".roulette", {
            spacing: 8,
            acceleration: 500,
            fps: 60,
            audio: null,
            selector: ":scope > *",
            stopCallback: function ({ detail: { prize } }) {
                console.log(`Selected prize: ${prize.index}, ${prize.element.innerText}`);
                document.querySelector('h2').innerText = prize.element.innerText + ' 당첨!';
                isSpinning = false;
            },
            startCallback: function () {
                console.log("start");
                // document.querySelector('.roulette_list').style.width = roller.width - roller.prizeWidth + 'px';
                document.querySelector('.roulette').style.width = roller.width - roller.prizeWidth + 24 + 'px';
            }
        });
        roller.rotateTo(getRandomInt(0, document.querySelectorAll('.roulette div').length - 1), { time: 2, random: false });
    });

};