async function getWaveData(lat, lon) {


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


                height:null,


                period:null,


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





function calculateVisibilityScore(waves) {


    let score = 0;


    /*
    
    Bølger bruges kun til:
    
    - sigtbarhed
    - uro i vandet
    - UV-jagt forhold
    
    Ikke til selve ravtransporten.
    
    */


    if (!waves) {


        return 0;


    }



    return score;


}
