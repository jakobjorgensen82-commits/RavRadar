async function calculateRavScore(data) {


    let score = 0;


    /*
    Vindhistorik
    Maks 30 point
    */

    if (data.windHistory) {

        score += data.windHistory.score || 0;

    }



    /*
    Strøm
    Maks 30 point
    */

    if (data.current) {

        score += data.current.score || 0;

    }



    /*
    Vandstand
    Maks 20 point
    */

    if (data.waterLevel) {

        score += data.waterLevel.score || 0;

    }



    /*
    Fremtidig vind
    Maks 10 point
    */

    if (data.windForecast) {

        score += data.windForecast.score || 0;

    }



    /*
    Sigtbarhed
    Maks 10 point
    */

    if (data.visibility) {

        score += data.visibility.score || 0;

    }



    return {


        score: Math.round(score),


        rating:

            score >= 80
            ? "Meget gode forhold"

            :

            score >= 60
            ? "Gode forhold"

            :

            score >= 40
            ? "Middel forhold"

            :

            "Dårlige forhold"


    };


}
