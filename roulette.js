const Roulette = (function () {

    const rotationStopEventName = "rotationStop";
    const rotationStartEventName = "rotationStart";

    const rouletteClass = "roulette";
    const rouletteListClass = "roulette_list";
    const roulettePrizeClass = "roulette_prize";

    const PrizeNotFoundException = "Prize not found";
    const ItemsNotFoundException = "Items not found";
    const NotImplementedException = "Not implemented";
    const NotEnoughArgumentsException = "Not enough arguments";
    const ContainerUndefinedException = "Container was undefined";
    const RotationIsAlreadyActiveException = "Rotation is already active";

    const rotationTokens = new WeakMap();

    class Prize {

        constructor(element, index, spacing, width, height) {
            this.index = index;
            this.element = element;

            let wrapper = document.createElement("li");
            wrapper.classList.add(roulettePrizeClass);
            wrapper.style.marginRight = `${spacing}px`;
            wrapper.style.minWidth = `${width}px`;
            wrapper.style.minHeight = `${height}px`;
            wrapper.appendChild(element);

            this.wrapper = wrapper;
        }

    }

    class Roulette {

        constructor(container, options) {
            let {
                spacing = 10,
                acceleration = 350,
                fps = 40,
                audio = "libs/vanillaRoulette/click.wav",
                selector = ":scope > *",
                stopCallback = null,
                startCallback = null
            } = options || {};

            let node =
                typeof container === "string" ?
                    document.querySelector(container) :
                    container instanceof HTMLElement ?
                        container :
                        container && container[0] instanceof HTMLElement ?
                            container[0] :
                            undefined;

            if (!node)
                throw ContainerUndefinedException;

            node.classList.add(rouletteClass);

            let list = document.createElement("ul");
            list.classList.add(rouletteListClass);

            let childNodes = [...node.querySelectorAll(selector)];
            if (!childNodes.length)
                throw ItemsNotFoundException;
            let injector = childNodes[0].parentElement
            let maxWidth = Math.max(...childNodes.map(x => x.clientWidth));
            let maxHeight = Math.max(...childNodes.map(x => x.clientHeight));
            let prizes = childNodes.map((el, i) => new Prize(el, i, spacing, maxWidth, maxHeight));
            for (let prize of prizes)
                list.appendChild(prize.wrapper);

            node.style.padding = `${spacing}px`;
            injector.appendChild(list);

            let player = typeof audio === "string" ? new Audio(audio) : audio && audio.play ? audio : null;
            if (player && !player.clone)
                player.clone = player.cloneNode ? player.cloneNode : () => player;

            this.container = node;
            this.list = list;
            this.prizes = prizes;
            this.spacing = spacing;
            this.acceleration = acceleration;
            this.width = (spacing + maxWidth) * prizes.length;
            this.prizeWidth = maxWidth;
            this.audio = player;
            this.fps = fps;
            rotationTokens.set(this, -1);

            if (startCallback) {
                this.container.addEventListener(rotationStartEventName, startCallback);
                this.startCallback = startCallback;
            }
            if (stopCallback) {
                this.container.addEventListener(rotationStopEventName, stopCallback);
                this.stopCallback = stopCallback;
            }
        }

        rotate(pixels = 0) {
            if (this.rotates)
                throw RotationIsAlreadyActiveException;
            if (pixels > 0)
                rotateForward.bind(this)(pixels);
        }

        rotateTo(block, options) {
            if (this.rotates)
                throw RotationIsAlreadyActiveException;
            let numBlock = Number(block);
            let prize = Number.isNaN(numBlock) ? this.findPrize({ element: block }) : this.findPrize({ index: numBlock });
            if (!prize)
                throw PrizeNotFoundException;
            this.prize = prize;
            let { tracks = 0, time = 0, random = true } = options || {};
            time |= 0;
            tracks |= 0;
            if (this.selectedPrize.index === prize.index && !time && !tracks)
                return;
            if (time)
                rotateByTime.bind(this)(prize, time, random);
            else
                rotateByTracks.bind(this)(prize, tracks, random);
        }

        playClick() {
            if (this.audio) {
                let promise = this.audio.clone().play();
                if (promise && promise.catch)
                    promise.catch(() => { });
            }
        }

        findPrize(options) {
            let { index, element } = options || {};
            if ((typeof index !== "number" || Number.isNaN(index)) && !element)
                throw NotEnoughArgumentsException;
            return element ? this.prizes.find(x => x.element === element) : this.prizes[index];
        }

        stop() {
            if (this.rotates) {
                clearInterval(rotationTokens.get(this));
                rotationTokens.set(this, -1);
                this.container.dispatchEvent(new CustomEvent(rotationStopEventName, { detail: { prize: this.selectedPrize } }));
                this.container.removeEventListener(rotationStopEventName, this.stopCallback);
            }
        }

        get selectedPrize() {
            return this.prize;

            let afterCenter =
                this.prizes.concat()
                    .sort((a, b) => a.wrapper.offsetLeft - b.wrapper.offsetLeft)
                    .find(prize => prize.wrapper.offsetLeft > this.center);
            return afterCenter ? this.prizes[(this.prizes.length + afterCenter.index - 1) % this.prizes.length] : this.prizes[this.selectedIndex];
        }

        get firstBlock() {
            return this.findPrize({ element: this.list.querySelector(`:scope > .${roulettePrizeClass} > *`) });
        }

        get lastBlock() {
            let nodes = this.list.querySelectorAll(`:scope > .${roulettePrizeClass} > *`);
            return this.findPrize({ element: nodes[nodes.length - 1] });
        }

        get rotates() {
            return rotationTokens.get(this) > -1;
        }

        get center() {
            return this.list.offsetLeft + this.list.clientWidth / 2;
        }

        static get version() {
            return "1.1.0";
        }
    }

    function rotateForward(pixels) {
        this.container.dispatchEvent(new CustomEvent(rotationStartEventName, { detail: { prize: this.selectedPrize } }));
        this.container.removeEventListener(rotationStartEventName, this.startCallback);

        pixels = Math.abs(pixels);
        let starter = Math.abs(Number(this.firstBlock.wrapper.style.marginLeft.replace("px", "")));

        let k = this.acceleration;
        let v0 = Math.sqrt(2 * k * pixels);
        let totalTime = v0 / k;

        let intervalMS = 1000 / this.fps;
        let intervalS = intervalMS / 1000;

        let blockWidth = this.prizeWidth + this.spacing;
        let t = 0;
        let currentBlock = 0;
        let played = false;
        let halfBlock = this.spacing + this.prizeWidth / 2;

        let token = setInterval(() => {

            if (t > totalTime) {
                this.stop();
                return;
            }

            let currentPos = (starter + (v0 * t - k * t * t / 2)) % this.width;

            if (Math.floor(currentPos / blockWidth) != currentBlock) {
                let block = this.firstBlock;
                this.list.appendChild(block.wrapper);
                block.wrapper.style.marginLeft = "0px";
                currentBlock = (currentBlock + 1) % this.prizes.length;
                played = false;
            }
            let margin = currentPos % blockWidth;
            this.firstBlock.wrapper.style.marginLeft = `-${margin}px`;
            if (margin > halfBlock && !played) {
                played = true;
                this.playClick();
            }

            t += intervalS;

        }, intervalMS);

        rotationTokens.set(this, token);
    }

    function rotateByTracks(prize, tracks, random) {
        const blockWidth = this.prizeWidth + this.spacing;
        let currentBlock = this.selectedPrize;
        let length = Math.round(tracks) * this.width;

        let currentPosition = currentBlock.index * blockWidth + (this.center - currentBlock.wrapper.offsetLeft);
        const computedStyle = window.getComputedStyle(this.container);
        let destination = prize.index * blockWidth + this.spacing + this.prizeWidth / (this.container.scrollWidth - this.spacing * 2 <= this.list.clientWidth ? 1 : 2);
        if (destination < currentPosition)
            length += this.width - (currentPosition - destination);
        else
            length += destination - currentPosition;
        if (random)
            length += Math.random() * this.prizeWidth * .8 - this.prizeWidth * 0.4;
        this.rotate(length);
    }

    function rotateByTime(prize, time, random) {
        let v0 = this.acceleration * time;
        let l = v0 * v0 / (2 * this.acceleration);
        let tracks = Math.ceil(l / this.width);
        rotateByTracks.bind(this)(prize, tracks, random);
    }

    return Roulette;
})();