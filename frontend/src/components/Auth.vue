<template>

	<div class="modal-mask">
		<div class="modal-wrapper">
			<div class="modal-container">

				<div class="modal-header">
					<slot name="header">
						Войти
					</slot>
				</div>

				<div class="modal-body">
					<slot name="body">

						<div class="error_container" v-if="error">
							{{ error }}
						</div>

						<div v-if="!error">

							<div class="loading_container" v-if="isLoading">
								<div class="half-circle-spinner">
									<div class="circle circle-1"></div>
									<div class="circle circle-2"></div>
								</div>
							</div>

							<div class="inputs_container" v-if="!isLoading">
								<form v-on:submit.prevent="auth">
									<input type="text" v-model="username" placeholder="Имя пользователя" ref="usernameInput">
									<input type="password" v-model="password" placeholder="Пароль">
									<input type="submit">
								</form>
							</div>

						</div>

					</slot>
				</div>

				<div class="modal-footer">
					<slot name="footer">
						&nbsp;
						<button v-if="!isLoading && (!error)" class="modal-default-button" @click="auth">Sign In</button>
					</slot>
				</div>

			</div>
		</div>
	</div>


</template>
<script>
const md5 = require('blueimp-md5'); // the one with no dependecies

export default {
	data() {
		return {
			isAuthenticated: false,
			username: 'admin',
			password: 'admin',
			isLoading: false,
			error: null,
			authCode: null
		}
	},
	mounted: function() {
		this.$nextTick(()=>{
			this.$refs.usernameInput.focus();
		});

		setTimeout(()=>{
			this.auth();
		}, 50);
	},
	watch: {
		isAuthenticated: function(v) {
			if (v) {
				this.$emit('authenticated', this.authCode);				
			} else {
				this.$emit('nobody');				
			}
		},
		error: function(v) {
			/// hide error after one second and show the form again
			if (v) {
				setTimeout(()=>{
					this.error = null;
					this.isLoading = false;
					
					this.$nextTick(()=>{
						this.$refs.usernameInput.focus();
					});
				}, 1000);
			}
		}
	},
	methods: {
		auth: function() {
			let promise = new Promise((resolve, reject)=>{
				// resolve(true);
				this.isLoading = true;

				axios.post('/api/authNonce', {}).
					then((response)=>{
						if (response && response.data && response.data.nonce) {
							return axios.post('/api/auth', {
								username: this.username,
								password: md5(''+response.data.nonce+this.password)
							});
						} else {
							throw new Error("Can not get auth nonce from the server");
						}
					}).then((response)=>{
						if (response && response.data && response.data.success && response.data.authCode) {
							this.isAuthenticated = true;
							this.error = null;
						} else {
							throw new Error("Something is wrong singing in to the server");
						}
					}).catch((error)=>{
						this.error = "Wrong username or password";
					}).finally(()=>{
						this.isLoading = false;
					});

			});

			promise.then((success)=>{
				this.isAuthenticated = success;
			});
		},
		showModal: function() {

		}
	}
}	
</script>
<style>

.modal-mask {
  position: fixed;
  z-index: 99998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, .9);
  display: table;
  transition: opacity .3s ease;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  width: 300px;
  margin: 0px auto;
  padding: 20px 30px;
  background-color: #fff;
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
  transition: all .3s ease;
  font-family: Helvetica, Arial, sans-serif;
}

.modal-header h3 {
  margin-top: 0;
  color: #42b983;
}

.modal-body {
  margin: 20px 0;
}

.modal-body input {
	margin: 5px 0 10px 0;
}

.modal-body input[type=submit] {
	display: none;
}

.modal-default-button {
  float: right;
}


.loading_container {
	width: 60px;
	height: 60px;
	margin: 0 auto;
}

.half-circle-spinner, .half-circle-spinner * {
      box-sizing: border-box;
    }

    .half-circle-spinner {
      width: 60px;
      height: 60px;
      border-radius: 100%;
      position: relative;
    }

    .half-circle-spinner .circle {
      content: "";
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 100%;
      border: calc(60px / 10) solid transparent;
    }

    .half-circle-spinner .circle.circle-1 {
      border-top-color: #1d1d1d;
      animation: half-circle-spinner-animation 1s infinite;
    }

    .half-circle-spinner .circle.circle-2 {
      border-bottom-color: #1d1d1d;
      animation: half-circle-spinner-animation 1s infinite alternate;
    }

    @keyframes half-circle-spinner-animation {
      0% {
        transform: rotate(0deg);

      }
      100%{
        transform: rotate(360deg);
      }
    }





/*
 * The following styles are auto-applied to elements with
 * transition="modal" when their visibility is toggled
 * by Vue.js.
 *
 * You can easily play with the modal transition by editing
 * these styles.
 */

.modal-enter {
  opacity: 0;
}

.modal-leave-active {
  opacity: 0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}


</style>