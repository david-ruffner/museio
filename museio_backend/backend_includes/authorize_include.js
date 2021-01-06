const common_include = require("./common_include");
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

var Response = common_include.Response;

// This is used to generate a new token for a user when they reset their password. This allows them to keep using the site without having to log out.
function issue_token(user_email, user_password, program_init) {
    return new Promise((resolve, reject) => {
        program_init.connection.query("SELECT Email_Address, First_Name, Last_Name, Jwt_Key, Salt, Hash FROM Users WHERE Email_Address = ?", [user_email], function(err, result) {
            if (err) {
                return reject(new Response('internal_error', 'Sorry, something went wrong while generating a new token.', 500))
            }

            if (result.length < 1) {
                return reject(new Response(`incorrect_username_or_password`, `Your given username or password was incorrect.`, 200))
            }
            else {
                var user_account = result[0];

                // Grab the user's salt, and form a comparator hash
                let comparator_hash = crypto.createHash("sha512").update(user_account.Salt + user_password).digest('hex');

                // Check if the comparator hash equals the user's hash
                if (comparator_hash.toLocaleLowerCase() != user_account.Hash.toLocaleLowerCase()) {
                    return reject(new Response(`incorrect_username_or_password`, `Your given username or password was incorrect.`, 200))
                }

                // Generate a token with the user's jwt key
                var jwt_token_data = {
                    email: user_account.Email_Address,
                    first_name: user_account.First_Name,
                    last_name: user_account.Last_Name,
                    persistent_login: false
                };

                // The token will expire 1 day after it's signed
                var jwt_token = jwt.sign({
                    nbf: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + (3600 * 24),
                    data: jwt_token_data
                }, user_account.Jwt_Key);

                // Load the public key file and encrypt the token
                try {
                    let encrypted_token = program_init.public_key.encrypt(jwt_token);
                    encrypted_token = encrypted_token.toString("base64");

                    return resolve(new Response(`success`, encrypted_token, 200))
                }
                catch (ex) {
                    return resolve(new Response(`internal_error`, `Sorry, something went wrong on our end while logging you in. Please try again.`, 500))
                }
            }
        })
    })
}

function reissue_token(jwt_data, user_jwt_key, token_reissue_total, user_email, program_init) {
    return new Promise((resolve, reject) => {
        // Make sure that jwt_data has the necessary params
        if (!jwt_data.email || jwt_data.email.length < 1
            || !jwt_data.first_name || jwt_data.first_name.length < 1
            || !jwt_data.last_name || jwt_data.last_name.length < 1) {
                return reject(
                    new Response(
                        "invalid_jwt_structure",
                        "The given jwt token has an invalid payload.",
                        500
                    )
                );
        }

        // If the token reissue total is 30 or more (should never be more than 30), the user must log in again. This allows a user to stay logged in for a month.
        if (token_reissue_total >= 30) {
            return reject(
                new Response(
                    "user_must_login_again",
                    "The user has been logged in for too long, and must log in again.",
                    200
                )
            )
        }

        // Update the user's account by incrementing their current token reissue total
        token_reissue_total++;
        program_init.connection.query("UPDATE Users SET Token_Reissue_Total = ? WHERE Email_Address = ?", [token_reissue_total, user_email], (err, result) => {
            if (err) {
                return reject(
                    new Response(
                        "internal_error",
                        "Sorry, something went wrong while issuing a new token. Please login again.",
                        500
                    )
                )
            }
            
            // Generate a new token
            let new_jwt_token = jwt.sign({
                nbf: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (3600 * 24),
                data: jwt_data
            }, user_jwt_key);

            // Encrypt the new token
            try {
                let encrypted_token = program_init.public_key.encrypt(new_jwt_token).toString("base64");
                return resolve(
                    new Response(
                        "success",
                        encrypted_token,
                        200
                    )
                )
            }
            catch (ex) {
                return reject(
                    new Response(
                        "internal_error",
                        "Sorry, something went wrong while issuing a token. Please login again.",
                        500
                    )
                )
            }
        })
    })
}

function authorize_token(given_token, program_init) {
    return new Promise((resolve, reject) => {
        // Make sure that the given token isn't empty
        if (!given_token || given_token.length < 1) {
            return reject(new Response("invalid_token", "A token was either not given, or was empty.", 400))
        }

        // Load the system's private key, and try to decrypt the given token
        try {
            var decrypted_token = program_init.private_key.decrypt(Buffer.from(given_token, "base64")).toString();

            // Try to extract the data from the inner JWT' s payload
            var jwt_data = jwt.decode(decrypted_token).data;

            // Make sure that the inner token's payload includes an email address
            if (!jwt_data.email || jwt_data.email.length < 1) {
                return reject(new Response("invalid_token", "Sorry, the given token couldn't be authorized because its internal structure was invalid.", 400));
            }            
        }
        catch (error) {
            return reject(new Response("internal_error", `Sorry, something went authorizing your given token.`, 500));
        }

        // Try to get the given account's info
        program_init.connection.query("SELECT Profile_Image, Email_Address, Jwt_Key, Token_Reissue_Total FROM Users WHERE Email_Address = ?", [jwt_data.email], function(err, result) {
            if (err) {
                return reject(new Response("internal_error", `Sorry, something went wrong while authorizing your token.`, 500));
            }

            if (result.length < 1) {
                return reject(new Response("incorrect_username_or_password", `Your given username or password was incorrect`, 200));
            }
            else {
                let user_account = result[0];

                // Attempt to verify the inner JWT with the user's jwt key
                try {
                    jwt.verify(decrypted_token, user_account.Jwt_Key);

                    return resolve(
                        {
                            status: 'success',
                            user_email_address: jwt_data.email,
                            user_first_name: jwt_data.first_name,
                            user_last_name: jwt_data.last_name,
                            user_profile_photo: Buffer.from(user_account.Profile_Image).toString("base64")
                        }
                    )
                }
                catch (err) {
                    // Check if the token is expired
                    if (err.name === "TokenExpiredError") {
                        // If the token is persistent, reissue a new token without requiring re-login
                        if (jwt_data.persistent_login) {
                            reissue_token(jwt_data, user_account.Jwt_Key, user_account.Token_Reissue_Total, user_account.Email_Address, program_init)
                            .then(new_token => {
                                return resolve(
                                    {
                                        status: 'success',
                                        user_email_address: jwt_data.email,
                                        user_first_name: jwt_data.first_name,
                                        user_last_name: jwt_data.last_name,
                                        user_profile_photo: Buffer.from(user_account.Profile_Image).toString("base64"),
                                        new_token: new_token
                                    }
                                )
                            })
                            .catch(error => {
                                return reject(error);
                            })
                        }
                        else {
                            return reject(
                                new Response(
                                    "expired_token",
                                    "The given token has expired. Please login again.",
                                    200
                                )
                            )
                        }
                    }
                    else {
                        return reject(
                            new Response(
                                "invalid_token",
                                "The given token is invalid. Please login again.",
                                200
                            )
                        )
                    }
                }
            }
        })
    })
}

module.exports = {
    authorize_token: authorize_token,
    issue_token: issue_token
}