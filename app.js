let requestAddress = 'https://www.shattered-world-api.link/api/location/';

const caverns = document.querySelectorAll('.cavern');
const rings = document.querySelectorAll('.ring');
const links = document.querySelectorAll('.link');

let allCavernData
let allLinkData

async function hideDefinedElements() {
    for (let ring of rings) {
        ring.classList.add('d-none');
    }
    for (let cavern of caverns) {
        cavern.classList.add('d-none');
    }
}

async function buildData() {
    const allCaverns = await axios.get(`${requestAddress}caverns/`);
    allCavernData = allCaverns.data;
    const allLinks = await axios.get(`${requestAddress}links/`);
    allLinkData = allLinks.data;
}

async function setUpLinks() {

    class Line {
        constructor(cavernA, cavernB, elementA, elementB) {
            this.cavernA = cavernA; //database object
            this.cavernB = cavernB; //database object
            this.elementA = elementA; //HTML Div
            this.elementB = elementB; //HTML Div
            this.pointA = {
                'left': Number((window.getComputedStyle(this.elementA).left).slice(0, -1)),
                'top': Number((window.getComputedStyle(this.elementA).top).slice(0, -1))
            }
            this.pointB = {
                'left': Number((window.getComputedStyle(this.elementB).left).slice(0, -1)),
                'top': Number((window.getComputedStyle(this.elementB).top).slice(0, -1))
            }
            // Makes sure the origin point of the line is the leftmost cavern so that 
            // arctan calculates the radians correctly.
            if (this.pointA.left > this.pointB.left) {
                let pointContainerA = { ...this.pointA }
                let pointContainerB = { ...this.pointB }
                this.pointA = { ...pointContainerB };
                this.pointB = { ...pointContainerA };
                let cavernContainerA = { ...this.cavernA }
                let cavernContainerB = { ...this.cavernB }
                this.cavernA = { ...cavernContainerB }
                this.cavernB = { ...cavernContainerA }
            }
            this.width = Math.sqrt(((this.pointA.left - this.pointB.left) ** 2) + ((this.pointA.top - this.pointB.top) ** 2))
            this.radians = Math.atan(((this.pointA.top - this.pointB.top) / (this.pointA.left - this.pointB.left)));
        }
    }

    function applyGradient(linkDiv, line, color = '#808080') {
        if (line.width >= 20) {
            if (!line.cavernA.found && line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to left, ${color}, transparent 25%)`;
            } else if (line.cavernA.found && !line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to right, ${color}, transparent 25%)`;
            }
        } else if (line.width >= 15 && line.width < 20) {
            if (!line.cavernA.found && line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to left, ${color}, transparent 50%)`;
            } else if (line.cavernA.found && !line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to right, ${color}, transparent 50%)`;
            }
        } else if (line.width >= 10 && line.width < 15) {
            if (!line.cavernA.found && line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to left, ${color}, transparent 75%)`;
            } else if (line.cavernA.found && !line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to right, ${color}, transparent 75%)`;
            }
        } else {
            if (!line.cavernA.found && line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to left, ${color}, transparent)`;
            } else if (line.cavernA.found && !line.cavernB.found) {
                linkDiv.style.background = `linear-gradient(to right, ${color}, transparent)`;
            }
        }
    }

    try {
        const foundLinks = allLinkData.filter((item) => item.found);

        for (let link of foundLinks) {
            const cavernA = allCavernData.filter((cavern) => cavern.id === link.caverns[0])[0];
            const cavernB = allCavernData.filter((cavern) => cavern.id === link.caverns[1])[0];
            const connectionA = document.querySelector(`.cavern[data-item-id="${link.caverns[0]}"]`);
            const connectionB = document.querySelector(`.cavern[data-item-id="${link.caverns[1]}"]`);
            const line = new Line(cavernA, cavernB, connectionA, connectionB);
            const linkDiv = document.querySelector(`.link[data-item-id="${link.id}"]`);

            //////////////////
            // Applies styling to Links
            linkDiv.classList.add('line');
            linkDiv.style.left = `${line.pointA.left}%`;
            linkDiv.style.top = `${line.pointA.top}%`;
            linkDiv.style.width = `${line.width}%`;
            linkDiv.style.transform = `rotate(${line.radians}rad)`;
            linkDiv.style.marginTop = '-5px';
            applyGradient(linkDiv, line);
            //////////////////

            //////////////////
            // Creates Span in linkDiv containing travel duration text
            let linkSpan = document.createElement('span');
            linkSpan.classList.add('link-span');
            linkSpan.classList.add('d-none');
            linkSpan.innerText = `${link.travel_duration} Hrs`;
            linkDiv.append(linkSpan);
            //////////////////

            //////////////////
            // Adds Mutation Observer to Links to apply new styling if linked cavern is active
            function hasClass(element, className) {
                return element.classList.contains(className);
            }
            const observer = new MutationObserver(() => {
                if (hasClass(connectionA, 'activeCavern') || hasClass(connectionB, 'activeCavern')) {
                    if (!hasClass(linkDiv, 'redLink')) {
                        linkDiv.classList.add('redLink');
                        applyGradient(linkDiv, line, '#ff0000');
                    }
                } else {
                    if (hasClass(linkDiv, 'redLink')) {
                        linkDiv.classList.remove('redLink');
                        applyGradient(linkDiv, line);
                    }
                }
            });
            const config = { attributes: true, attributeFilter: ['class'] };
            observer.observe(connectionA, config);
            observer.observe(connectionB, config);
            ///////////////////
        }
    } catch (e) {
        console.log(e);
    }
}

async function setUpCaverns() {
    try {
        const foundCaverns = allCavernData.filter((item) => item.found);
        const foundCavernIds = foundCaverns.map((item) => item['id']);
        const currentCaverns = allCavernData.filter((item) => item.current);
        const currentCavernIds = currentCaverns.map((item) => item['id']);
        caverns.forEach(async (cavern) => {
            let cavernID = cavern.dataset.itemId;
            if (foundCavernIds.includes(parseInt(cavernID))) {
                cavern.classList.toggle('d-none');
            }
            if (currentCavernIds.includes(parseInt(cavernID))) {
                cavern.classList.add('current');
            }
        })

        const foundLayers = [...new Set(foundCaverns.map((item) => item['layer']))];
        for (let i = 1; i <= 5; i++) {
            if (foundLayers.includes(i)) {
                document.querySelector(`#ring-${i}`).classList.toggle('d-none');
            }
        }
    } catch (e) {
        console.log('Error', e);
    }
}

async function hideLoadingScreen() {
    const loadingScreen = document.querySelector('#loading-screen');
    loadingScreen.classList.add('d-none');
}

async function addEventListeners() {
    caverns.forEach((cavern) => {
        cavern.addEventListener('click', async (e) => {
            let cavernId = parseInt(cavern.dataset.itemId);
            let cavernData = allCavernData.filter((cavern) => cavern.id === cavernId)[0];
            cavern.classList.toggle('activeCavern');
            if (cavern.innerText) {
                cavern.innerText = '';
                cavern.style.zIndex = '5';
            } else {
                cavern.innerText = `${cavernData.name}`;
                cavern.style.zIndex = '9';
            }
        })
    })

    links.forEach(async (link) => {
        let linkId = parseInt(link.dataset.itemId);
        let linkData = allLinkData.filter((link) => link.id === linkId)[0];
        let cavernA = allCavernData.filter((cavern) => cavern.id === linkData.caverns[0])[0];
        let cavernB = allCavernData.filter((cavern) => cavern.id === linkData.caverns[1])[0];
        if (cavernA.found && cavernB.found) {
            link.addEventListener('click', async (e) => {
                let linkSpan = link.querySelector('span');
                linkSpan.classList.toggle('d-none');
                link.classList.toggle('bring-to-front');
            })
        }
    })
}

async function setUpPage() {
    // All page elements have to be hidden before setUpLinks runs
    // or the displayed caverns will have their offset returned in
    // pixels and the hidden caverns will have their offset returned
    // in percentages.  These offsets are used to determine the
    // positions of the Link lines.
    await hideDefinedElements();
    await buildData();
    await setUpLinks();
    await setUpCaverns();
    await addEventListeners();
    await hideLoadingScreen();
}

setUpPage()


