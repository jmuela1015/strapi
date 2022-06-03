import { Formik } from 'formik';
import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Button } from '@strapi/design-system/Button';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import {
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system/ModalLayout';
import { FieldLabel } from '@strapi/design-system/Field';
import { Stack } from '@strapi/design-system/Stack';
import { Typography } from '@strapi/design-system/Typography';
import { VisuallyHidden } from '@strapi/design-system/VisuallyHidden';
import { Form } from '@strapi/helper-plugin';

import { getTrad } from '../../utils';
import SelectTree from '../SelectTree';
import { useFolderStructure } from '../../hooks/useFolderStructure';

export const BulkMoveDialog = ({ onClose, errors: initialErrors }) => {
  const submitButtonRef = useRef(null);
  const { formatMessage } = useIntl();
  const { data: folderStructure, isLoading } = useFolderStructure();
  const initialFormData = {
    destination: folderStructure[0],
  };

  const handleSubmit = values => {
    onClose({ moved: true, destinationFolderId: values.destination.value });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <ModalLayout onClose={handleClose} labelledBy="title">
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('modal.folder.move.title'),
            defaultMessage: 'Move elements to',
          })}
        </Typography>
      </ModalHeader>

      <ModalBody>
        <Formik
          validateOnChange={false}
          onSubmit={handleSubmit}
          initialValues={initialFormData}
          initialErrors={initialErrors}
        >
          {({ values, errors, setFieldValue }) => (
            <Form noValidate>
              <Grid gap={4}>
                <GridItem xs={12} col={12}>
                  <Stack spacing={1}>
                    <FieldLabel htmlFor="folder-destination">
                      {formatMessage({
                        id: getTrad('form.input.label.folder-location'),
                        defaultMessage: 'Location',
                      })}
                    </FieldLabel>

                    <SelectTree
                      options={folderStructure}
                      onChange={value => {
                        setFieldValue('destination', value);
                      }}
                      defaultValue={values.destination}
                      name="destination"
                      menuPortalTarget={document.querySelector('body')}
                      inputId="folder-destination"
                      {...(errors.destination
                        ? {
                            'aria-errormessage': 'folder-destination-error',
                            'aria-invalid': true,
                          }
                        : {})}
                    />

                    {errors.destination && (
                      <Typography
                        variant="pi"
                        as="p"
                        id="folder-destination-error"
                        textColor="danger600"
                      >
                        {errors.destination}
                      </Typography>
                    )}
                  </Stack>
                </GridItem>
              </Grid>

              <VisuallyHidden>
                <button type="submit" tabIndex={-1} ref={submitButtonRef} name="hidden-submit">
                  {formatMessage({ id: 'submit', defaultMessage: 'Submit' })}
                </button>
              </VisuallyHidden>
            </Form>
          )}
        </Formik>
      </ModalBody>

      <ModalFooter
        startActions={
          <Button onClick={handleClose} variant="tertiary" name="cancel">
            {formatMessage({ id: 'cancel', defaultMessage: 'Cancel' })}
          </Button>
        }
        endActions={
          <Button onClick={() => submitButtonRef.current.click()} name="submit" loading={isLoading}>
            {formatMessage({ id: 'modal.folder.move.submit', defaultMessage: 'Move' })}
          </Button>
        }
      />
    </ModalLayout>
  );
};

BulkMoveDialog.defaultProps = {
  errors: null,
};

BulkMoveDialog.propTypes = {
  errors: PropTypes.shape({
    destination: PropTypes.string.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
};