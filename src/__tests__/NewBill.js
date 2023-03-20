/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import router from "../app/Router.js";
import BillsUI from "../views/BillsUI.js";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import mockedStore from "../__mocks__/store";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES } from "../constants/routes.js";


const onNavigate = (pathname) => {
  document.body.innerHTML = ROUTES({ pathname });
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
window.localStorage.setItem('user', JSON.stringify({
  type: 'Employee',
  email: 'test@yes.fr'
}))
window.alert = jest.fn()

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    it('Should render newBill Page', () => {
      const html = NewBillUI()
      document.body.innerHTML = html
      expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
    })

    it("Change file handler should alert if file format is not supported", async () => {
      const files = {
        wrongFile1: 'badFormat.xzn',
        wrongFile2: 'noExtension',
        goodFile: 'goodFormat.png'
      }

      const html = NewBillUI()
      document.body.innerHTML = html
      const newBill = new NewBill({ document, onNavigate, store: mockedStore, localStorage: window.localStorage })
      const spyHandleChangeFile = jest.spyOn(newBill, 'handleChangeFile')
      const formNewBill = screen.getByTestId('file')
      formNewBill.addEventListener('change', newBill.handleChangeFile)

      Object.keys(files).forEach(key => {
        const type = files[key].split('.')[1] ? `image/${files[key].split('.')[1]}` : ''
        fireEvent.change(formNewBill, {
          target: {
            files: [new File([files[key]], files[key], { type: type })]
          }
        })
      })
      expect(spyHandleChangeFile).toHaveBeenCalled()
      expect(window.alert).toHaveBeenCalledWith('Only jpeg, jpg or png format are suported.')
      expect(window.alert).toHaveBeenCalledTimes(4)
    })


    describe('POST integration test', () => {
      it('Submit handler should return newBill & navigate to Bills Page', async () => {
        const fakeBill = {
          type: 'Transports',
          name: 'Vol Paris/Berlin',
          date: '04-02-2021',
          amount: '1500',
          vat: '300',
          pct: '150',
          commentary: 'vol 1ere classe',
          filename: 'flightBill',
          fileUrl: 'C:\\fakepath\\flightBill.jpg'
        }

        document.body.innerHTML = NewBillUI()
        const newBill = new NewBill({ document, onNavigate, store: mockedStore, localStorage: window.localStorage })
        const spyHandleSubmit = jest.spyOn(newBill, 'handleSubmit')
        const form = screen.getByTestId('form-new-bill')
        const btnSubmitForm = form.querySelector('#btn-send-bill')
        const spyUpdateBill = jest.spyOn(newBill, 'updateBill')

        fireEvent.change(screen.getByTestId('expense-type'), { target: { value: fakeBill.type } })
        fireEvent.change(screen.getByTestId('expense-name'), { target: { value: fakeBill.name } })
        fireEvent.change(screen.getByTestId('datepicker'), { target: { value: fakeBill.date } })
        fireEvent.change(screen.getByTestId('amount'), { target: { value: fakeBill.amount } })
        fireEvent.change(screen.getByTestId('vat'), { target: { value: fakeBill.vat } })
        fireEvent.change(screen.getByTestId('pct'), { target: { value: fakeBill.pct } })
        fireEvent.change(screen.getByTestId('commentary'), { target: { value: fakeBill.commentary } })

        form.addEventListener('submit', ((event) => newBill.handleSubmit(event)))
        userEvent.click(btnSubmitForm)
        await waitFor(() => screen.getByText('Mes notes de frais'))

        expect(spyHandleSubmit).toHaveBeenCalled()
        expect(spyUpdateBill).toHaveBeenCalled()
        expect(screen.getByText('Mes notes de frais')).toBeTruthy()
      })


      describe("When an error occurs on API", () => {
        beforeEach(() => {
          jest.spyOn(mockedStore, "bills")
          Object.defineProperty(
            window,
            'localStorage',
            { value: localStorageMock }
          )
          window.localStorage.setItem('user', JSON.stringify({
            type: 'Employee',
            email: "a@a"
          }))
          document.body.innerHTML = ''
          const root = document.createElement("div")
          root.setAttribute("id", "root")
          document.body.appendChild(root)
          router()
        })

        it("fetches bills from an API and fails with 404 message error", async () => {
          mockedStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 404"))
              }
            }
          })
          document.body.innerHTML = BillsUI({ error: 'Erreur 404' })
          const message = screen.getByText(/Erreur 404/)
          expect(message).toBeTruthy()
        })

        it("fetches messages from an API and fails with 500 message error", async () => {
          mockedStore.bills.mockImplementationOnce(() => {
            return {
              list: () => {
                return Promise.reject(new Error("Erreur 500"))
              }
            }
          })
          document.body.innerHTML = BillsUI({ error: 'Erreur 500' })
          const message = screen.getByText(/Erreur 500/)
          expect(message).toBeTruthy()
        })
      })
    })
  })
})
