const caverns = document.querySelectorAll('.cavern');
const rings = document.querySelectorAll('.ring');
const links = document.querySelectorAll('.link');

const axiosRequestData = async (api, id) => {
    try {
        const res = await axios.get(`http://127.0.0.1:8000/api/location/${api}/${id}/`);
        return res.data;
    } catch (e) {
        return e;
    }
}

async function hideDefinedElements() {
    for (let ring of rings) {
        ring.classList.add('d-none');
    }
    for (let cavern of caverns) {
        cavern.classList.add('d-none');
    }
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
        let allLinks = await axios.get(`http://127.0.0.1:8000/api/location/links/`);
        let foundLinks = allLinks.data.filter((item) => item.found);
        // let foundLinks = allLinks.data

        for (let link of foundLinks) {
            const cavernA = await axiosRequestData('caverns', link.caverns[0]);
            const cavernB = await axiosRequestData('caverns', link.caverns[1]);
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
            applyGradient(linkDiv, line);
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
        const allCaverns = await axios.get(`http://127.0.0.1:8000/api/location/caverns/`);
        const foundCaverns = allCaverns.data.filter((item) => item.found);
        const foundCavernIds = foundCaverns.map((item) => item['id']);
        const currentCaverns = allCaverns.data.filter((item) => item.current);
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
                document.querySelector(`#ring-${i}`).classList.toggle('d-none')
            }
        }
    } catch (e) {
        console.log('Error', e);
    }
}

async function setUpPage() {
    // All page elements have to be hidden before setUpLinks runs
    // or the displayed caverns will have their offset returned in
    // pixels and the hidden caverns will have their offset returned
    // in percentages.  These offsets are used to determine the
    // positions of the Link lines.
    await hideDefinedElements()
        .then(await setUpLinks())
        .then(await setUpCaverns());
}


caverns.forEach((cavern) => {
    cavern.addEventListener('click', async (e) => {
        let cavernId = cavern.dataset.itemId;
        let cavernData = await axiosRequestData('caverns', cavernId);
        cavern.classList.toggle('activeCavern')
        if (cavern.innerText) {
            cavern.innerText = '';
            cavern.style.zIndex = '5';
        } else {
            cavern.innerText = `${cavernData.name}`;
            cavern.style.zIndex = '10';
        }
        console.log(cavernData);

    })
})

setUpPage()


