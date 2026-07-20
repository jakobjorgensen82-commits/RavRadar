async function getWaterLevel(lat, lon) {

    /*
    DMI vandstand kobles på her.
    Denne funktion er klar til den rigtige API-forbindelse.
    */

    return {
        status: "klar",
        location: {
            lat: lat,
            lon: lon
        },
        forecast: []
    };

}