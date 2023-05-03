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
        constructor(cavernA, cavernB) {
            this.cavernA = cavernA;
            this.cavernB = cavernB;
            this.elementA = document.querySelector(`.cavern[data-item-id="${cavernA.id}"]`);
            this.elementB = document.querySelector(`.cavern[data-item-id="${cavernB.id}"]`);
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
                let containerA = { ...this.pointA }
                let containerB = { ...this.pointB }
                this.pointA = { ...containerB };
                this.pointB = { ...containerA };
            }
            this.width = Math.sqrt(((this.pointA.left - this.pointB.left) ** 2) + ((this.pointA.top - this.pointB.top) ** 2))
            this.radians = Math.atan(((this.pointA.top - this.pointB.top) / (this.pointA.left - this.pointB.left)));
        }
    }

    let allLinks = await axios.get(`http://127.0.0.1:8000/api/location/links/`);
    let foundLinks = allLinks.data.filter((item) => item.found);

    for (let link of foundLinks) {
        let cavernA = await axiosRequestData('caverns', link.caverns[0]);
        let cavernB = await axiosRequestData('caverns', link.caverns[1]);
        let line = new Line(cavernA, cavernB);

        const linkDiv = document.querySelector(`.link[data-item-id="${link.id}"]`);

        linkDiv.classList.add('line');
        linkDiv.style.left = `${line.pointA.left}%`;
        linkDiv.style.top = `${line.pointA.top}%`;
        linkDiv.style.width = `${line.width}%`;
        linkDiv.style.transform = `rotate(${line.radians}rad)`;

        const connectionA = document.querySelector(`.cavern[data-item-id="${link.caverns[0]}"]`);
        const connectionB = document.querySelector(`.cavern[data-item-id="${link.caverns[1]}"]`);

        function hasClass(element, className) {
            return element.classList.contains(className);
        }

        const observer = new MutationObserver(() => {
            if (hasClass(connectionA, 'activeCavern') || hasClass(connectionB, 'activeCavern')) {
                if (!hasClass(linkDiv, 'redLink')) {
                    linkDiv.classList.add('redLink');
                }
            } else {
                if (hasClass(linkDiv, 'redLink')) {
                    linkDiv.classList.remove('redLink');
                }
            }
        });

        const config = { attributes: true, attributeFilter: ['class'] };
        observer.observe(connectionA, config);
        observer.observe(connectionB, config);

    }

}

async function setUpCaverns() {

    try {

        const allCaverns = await axios.get(`http://127.0.0.1:8000/api/location/caverns/`);
        const foundCaverns = allCaverns.data.filter((item) => item.found);
        const foundCavernIds = foundCaverns.map((item) => item['id']);
        caverns.forEach((cavern) => {
            let cavernID = cavern.dataset.itemId;
            if (foundCavernIds.includes(parseInt(cavernID))) {
                cavern.classList.toggle('d-none');
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
        console.log(cavernData);

        cavern.classList.toggle('activeCavern')
    })
})

links.forEach((link) => {
    link.addEventListener('click', async () => {
        let linkId = link.dataset.itemId;
        let linkData = await axiosRequestData('links', linkId);
        console.log(linkData);
    })
})

setUpPage()


