const layerURL = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"

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

const complete = (result) => {
    let latlngs = [];
    let i = 1;
    let len = result.data.length;
    for (; i < len; i++) {
        // TODO: trim data, null parsing / douglas peucker algorithm to simplify trajectory
        if (result.data[i][9] && result.data[i][10]) {
            latlngs.push(new L.LatLng(parseFloat(result.data[i][9]), parseFloat(result.data[i][10])));
        }
    }
    const path = L.polyline(latlngs, {
        dashArray: "30,10",
        dashSpeed: -30
    });
    map.fitBounds(L.latLngBounds(latlngs));
    const start = L.marker(latlngs[0]);
    map.addLayer(start);
    const end = L.marker(latlngs[latlngs.length - 1]);
    map.addLayer(end);
    map.addLayer(path);
};

function addPath(uri) {
    Papa.parse(uri, {
        download: true,
        complete
    })
}

addPath("../data/drive.csv")

