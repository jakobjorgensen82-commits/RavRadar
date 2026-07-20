async function getCurrentData(lat, lon) {


    try {


        const now = new Date();


        const forecast = [];



        for (let i = 0; i < 120; i++) {


            let time = new Date(
                now.getTime() + i * 60 * 60 * 1000
            );



            forecast.push({

                time:
                time.toISOString(),


                speed:null,


                direction:null

            });


        }



        return {


            status:"ok",


            location:{

                lat:lat,

                lon:lon

            },


            forecast:forecast


        };



    }



    catch(error) {


        return {

            status:"error",

            message:error.message

        };


    }


}





function calculateCurrentScore(current) {


    let score = 0;


    /*
    Senere kobles rigtig strømdata på.

    Vi vurderer:
    - strømstyrke
    - strømretning
    - om transporten går mod kystsektoren

    */


    if (!current) {


        return 0;


    }



    return score;


}
