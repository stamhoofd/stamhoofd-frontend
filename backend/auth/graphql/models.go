// Code generated by github.com/99designs/gqlgen, DO NOT EDIT.

package graphql

type LoggedInResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

type ResetPasswordResponse struct {
	Email string `json:"email"`
}

type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}