const layerURL = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=ba52a661-85af-472c-a071-bb62fa316c3f"

const attribution = {
    prefix: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
}

let mapLoc = [33, -121]
let map = L.map('map', {
    zoomControl: false
}).setView(mapLoc, 13);

L.tileLayer(layerURL, {
    maxZoom: 20
}).addTo(map);

L.control.condensedAttribution(attribution).addTo(map);

const color = ["#000", "#00B300", "#53b400", "#79b400", "#99b300", "#b5b100", "#d0ae00", "#e8aa00", "#ffa600", "#fff"]

let legend = L.control({position: 'topright'});
legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'pmodes'),
        labels = ['<strong style="font-size: 18px">GNSS Modes</strong>', ''],
        categories = ['None', 'Single Point', 'Differential GNSS', 'Floated RTK', 'Fixed RTK', 'Dead Reckoning'
            , 'SBAS', 'Manual', 'Simulator', 'Unknown'];

    for (let i = 0; i < categories.length; i++) {
        const html = '<i class="circle" style="background:' + color[i] + '"></i> ' +
            (categories[i] ? categories[i] : '+');
        div.innerHTML += labels.push(html);
    }
    div.innerHTML = labels.join('<br>');
    return div;
};
legend.addTo(map);


const complete = (start_tow, end_tow) => (result) => {
    let latlngs = [], slng = [], lastPosMode = -1;
    for (let i = 1; i < result.data.length; i++) {
        // TODO: trim data, null parsing / douglas peucker algorithm to simplify trajectory
        const datum = result.data[i], tow = datum[1], lat = datum[9], lon = datum[10];
        if (tow && lat && lon) {
            const latlng = new L.LatLng(lat, lon);
            if (start_tow && tow < start_tow) continue
            if (end_tow && tow > end_tow) break // assume sorted
            latlngs.push(latlng);
            slng.push(latlng);
            if (datum[2]) {
                const pmode = parseInt(datum[2]);

                if (pmode !== lastPosMode) {
                    lastPosMode = pmode;
                    const path = L.polyline(slng, {
                        dashArray: "20,5",
                        dashSpeed: -10,
                        color: color[lastPosMode]
                    });
                    map.addLayer(path);

                    slng = [latlng]
                }
            }
        }
    }
    if (slng) {
        const path = L.polyline(slng, {
            dashArray: "20,5",
            dashSpeed: -10,
            color: color[lastPosMode]
        });
        map.addLayer(path);
    }

    map.fitBounds(L.latLngBounds(latlngs));

    const start = L.marker(latlngs[0], {title: "Start"}).bindPopup("Start");
    start.on('mouseover', () => start.openPopup());
    start.on('mouseout', () => start.closePopup());
    map.addLayer(start);

    const end = L.marker(latlngs[latlngs.length - 1], {title: "End"}).bindPopup("End");
    end.on('mouseover', () => end.openPopup());
    end.on('mouseout', () => end.closePopup());
    map.addLayer(end);
};

function clearPath() {
    for (i in map._layers) {
        if (map._layers[i]._marker !== undefined) {
            try {
                map.removeLayer(map._layers[i]);
            } catch (e) {
            }
        }
        if (map._layers[i]._path !== undefined || map._layers[i]._popup !== undefined) {
            try {
                map.removeLayer(map._layers[i]);
            } catch (e) {
            }
        }
    }
}

function addPath(uri, start_tow, end_tow) {
    clearPath();
    Papa.parse(uri, {
        download: true,
        complete: complete(start_tow, end_tow)
    })
}

const DRIVE_PATH = "data/drive.csv";

addPath(DRIVE_PATH)

vegaEmbed('#drive', "vg/drive_stats.vg.json", {
    patch: (spec) => {
        spec.signals.push({
            "name": "barClick",
            "value": 0,
            "on": [{"events": "mouseup", "update": "barClick + 1"}]
        })
        return spec;
    }
}).then(result => {
    result.view.addSignalListener('barClick', () => {
        const tow = result.view.data('brush_store');
        try {
            const range = tow[0].values[0]
            addPath(DRIVE_PATH, range[0], range[1])
        } catch (e) {
            console.log("unable to find range... reverting to unbounded")
            addPath(DRIVE_PATH)
        }
    })
}).catch(console.error);
vegaEmbed('#cdf', "vg/cdf.vg.json").then().catch(console.error);
vegaEmbed('#charts', "vg/charts.vg.json").then().catch(console.error);
vegaEmbed('#density', "vg/movement_density.vg.json").then().catch(console.error);
// vegaEmbed('#logs', "vg/logs.vg.json").then().catch(console.error);

